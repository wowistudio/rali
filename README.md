# Rali - Rate Limiter

> Disclaimer: this is a learning project for me. Diving in the world of rate limiters. I'm not an expert whatsoever. Every decision & claim in this project can and should be questioned :).

Our aim for this project is to design & implement a distributed rate limiter. Before diving in to the code, we will cover the need for a rate limiter, communication strategies in a distributed limiter architecture and discuss several rate limiting algorithms

## 1. Why do we need rate limiting?

Rate limiting is used to prevent excessive use of api resources by clients. This behavior can be intentional (planned attacks like brute force, ddos) or unintentional (misconfigured clients, testing, spike in users request the same resource). It helps even distribution among users.

It can also serve other goals, like ensuring up-time for business critical processes, keeping control over CPU-intensive endpoints, and shedding load in case of overload ([Stripe](https://stripe.com/blog/rate-limiters)).


## 2. Communication algorithms

1. **Broadcasting (all to all)** - 
Each limiter updates all other limiters. Does not scale well as number of limiters grow.
2. **Gossip** - 
Each limiter updates a (random) fixed number of limiters. The idea is that updates spread through the network like a virus.
3. **Distributed cache** - 
Each limiter keeps local state and updates to a central cache periodically (Redis, Memcached). It reduces overhead, but creates a single point of failure (in terms of load and correctness)


## 3. Rate limiting algorithms

Numerous algorithms exist, each with their own pros and cons when it comes to latency and complexity. This section describes each algorithm in detail; the table below summarizes them.


### Clock-based fixed window

The limiter allows X requests to be made in a fixed window. The counter resets at fixed time boundaries (e.g., every hour on the hour, or at midnight). You only need to store the current count. Also the count needs an expiration (supported by memory databases like Redis & Memcached) Requests within the window increment the counter until the limit is reached; at the next boundary, the window resets to zero.

This approach does not really enforce a rate. Users can choose to burst requests within a short timeframe, thereby exhausting the limit. Taking this a step further, a user can make a full burst of requests just before the window resets, then another full burst immediately after - effectively getting 2x the limit. This is referred to as the **boundary exploit**.

> One gotcha is how to deal with time issues and confusion around DST, time zone and clock drift between limiters


### Request-based fixed window

Instead of starting a window at fixed intervals, it starts when the first request arrives after the previous window has expired. You store the counter plus the timestamp of the first request in the current window. This reduces (but does not eliminate) the boundary problem, since windows align with actual usage rather than the clock.



### Sliding window

Instead of discrete windows and resetting the capacity after window expiry, requests refill one at a time: each request "consumes" a slot, and slots become available again as time passes. You must store a timestamp for each request to know when each slot frees up.

With this approach, the traffic is distrubuted smoothly. The drawback here is that it's harder to explain to user and more resource intensive. We need to store a timestamp for each request, and storage grows with increasing limits (O(n) per key). That is not scalable.


### Estimated sliding window

To fix the scalability problem of the sliding window, this approach uses information from the previous window to estimate the remaining capacity of the current window. The implementation should: 1) count number of request in last window, 2) count number of requests in current window, 3) estimate how many requests will still be made in the remainder of the current window.

This alternative will roughly lead to the same limits, but is far more efficient.

### Token bucket

Imagine a bucket that is filled from the top with tokens at a constant rate up to a maximum. Each request consumes one token from the bottom of the bucket. If the bucket is empty, the request is rejected.

This approach is more flexible for users: it allows bursts up to the bucket capacity but over time, the long-term average is capped at the refill rate.


### Generic Cell Rate Algorithm (GCRA)

GCRA is a variant of the token bucket algorithm. It uses a theoretical timestamp (TAT) instead of a bucket with tokens to determine the capacity. It's interval based instead of bucket based. 

In this approach, the faster you burst, the farther TAT moves into the future, widening the gap between real time and TAT. Eventually the gap exceeds the limit and requests are dropped and TAT stops advancing. Waiting allows real time to catch up (gap between now and TAT shrinks).

This approach is good if you care about timing rather than burst. Also, you only need to store the TAT timestamp (vs. last request timestamp & token count in token bucket approach). Drawback is that it's very hard to explain to users.

💡 Key intuition:
- Token Bucket: "I have X space/tokens, do I have room?" -> more bookkeeping
- GCRA: "Has enough time passed since last allowed event?" -> minimal bookkeeping

In practice, for small-scale apps it’s almost indistinguishable, but in high-throughput or distributed systems, GCRA can simplify implementation and reduce per-request cost.

---

### Summary

| Strategy | Info | Storage | Pros & Cons |
|----------|------|---------|-------------|
| Clock-based fixed window | Measure in set intervals (e.g., every hour) | Only the counter | Simple, cheap; large window bursts |
| Request-based fixed window | Interval starts at first request | Counter & timestamp of first request | Simple, reduces boundary spikes; still allows bursts |
| Sliding window | Refill one request at a time, instead of at end of interval | Timestamp for each request | Smooth traffic; high storage, more complex |
| Estimated sliding window | Approximate sliding window from current and previous window counts | Timestamp current window, total count of previous & current window | Smooth, scalable; approximate behaviour |
| Token bucket (leaky bucket) | Tokens added at constant rate; each request consumes a token | Current token count & last refill timestamp | Flexible bursts; extra state, tuning |
| Generic Cell Rate Algorithm (GCRA) | TAT-based: allow if gap between now and TAT ≤ L | Last theoretical arrival time (TAT) | Precise timing, minimal state; hard to explain |

## 4. What we will build

### Functional Requirements
- Is request rate limited or not
- Non-blocking if the system were to fail

### Non-fuctional requirements
- Latency - minimize time it takes to fulfil a request
- Consistency - we want to system to be as consistent as it can be
- Scalability - nodes in the system should be able to operate independently
- Extensibility - at some point we might want to allow for more than 1 rate limiting algorithm. Important for development.

There will be a tradeoff between how quickly can we respond vs. how accurate we are.

### API Endpoints

Keep it simple:
- `checkLimit(key: string) => {accept: boolean}`

### Algorithms

We will go with the [sliding window](###--estimated-sliding-window) algorithm for this design. It's easy to reason about, easy to implement, and proves to be good enough in practice.

As communication strategy we'll make use of a global memory cache where the limiters optionally read to in sync, and write to asynchronously. More on this the section [below](###--high-level-design).

### High level design

The diagram below shows the high level design of a rate limit check. The partipants in this design are the client, the limiter (1 of N) and the shared cache (redis).

Each of N limiters in the system is identical (node server) and operates independently. We make no assumption on the distribution of traffic between the limiters. All traffic from clients could go to a single limiter. This means there has to be some form of syncronization between the limiters. We have one global cache (redis) for that. High availability of the global cache is not in scope of this project.

Flow details:
- Each limiter keeps a local cache of rate limited clients. It stores `limitedUntil` (timestamp) for clients if they are rate limited.
- Before accessing the shared cache, the limiter first checks locally. This saves us the roundtrip to shared cache for rate limited clients. Also, it solves the SPOF problem from a CPU perspective.
- If `limitedUntil` is found in local cache, but the timestamp was in the past we consider it stale and remove it.
- If local and shared cache both do not have a `limitedUntil` for the client, it means we can accept the request.
- We process the write async so that the client doesn't have to wait. 
- We let the cache determine the `limitedUntil` if it hits the limit. In this way the limiter only needs to now about `limitedUntil` and doesn't require getting the counts from the current and previous window.

This design is similar to how Cloudflare has [done](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/#fn4) it, with an important difference. At Cloudflare, requests with the same IP address will always go through the nearest data center (PoP). That allowed Cloudflare to create an isolated counting system inside each PoP, thereby minimizing latency. In our design we don't make assumptions on what request arrives on what node. A client might very well first connect with limiter X the first time, and consequently with limiter Y.

With our design we minimize latency by making as little requests to Redis as possible and minimize data sent over the wire. The tradeoff is more storage (store info on until when a user if limited) and eventual consistency (we might have some false positives).

<!-- insert link to image  -->
![Flow diagram](https://github.com/wowistudio/rali/blob/main/files/flowdiagram.png?raw=true)


```
sequenceDiagram
    actor Client
    participant Limiter
    participant Redis

    Client->>Limiter: is rate limited?
    Limiter->>Limiter: GET limitedUntil 
    alt cache miss or stale
        Limiter->>Redis: GET limitedUntil
    end
    Limiter->>Client: accepted true/false
    alt async write
    Limiter->>Redis: INCR counter
    Redis->>Limiter: limitedUntil (if  >limit)
    Limiter->>Limiter: SET limitedUntil
    end 
```

### Redis Lua Script `windowIncrement`

> `./apps/api/src/redis/index.ts:10`


- **call behavior** - The lua script looks like a lot of code, but is not send to Redis on each call. Instead `ioredis` sends the Lua script to Redis using `SCRIPT LOAD`. On the first call the script is send to Redis, Redis compiles the script and returns SHA1 hash. Every next call uses `EVALSHA <sha1> ...`
- **redis commands** - On each call, the script uses `MGET` to get current count, previous count & start window timestamp. On the end of each call (if not passed limit), the script uses `SET` thrice to update the counts & timestamp. If passed limit, it uses `SET` once to set the limited until.
- **calculation of limitedUntil** - When we estimate that the curr count will go over the limit, we want to calculate until when the user is blocked in the current window. We do this by assuming there must exist ratio R for which the estimation does not exceed the limit (see below). This ratio then translate to a time in the future where the next request is allowed. In absence of previous count we set ratio to 1, which result in a future time equal to the end of the current window.
```
ratio R, previousCount P, currentCount C, limit L

=> P(1 - R) + C = L
=> ...
=> R = 1 - ((L - C) / P)
=> R = min(1, R)
```

## 5. Thoughts

- The lua script is heave on GET & SET, also feels like a lot is calculated. Not sure what the impact is of this on latency (I dont consider optimizing Redis in this project). I feel like we can move calculations to the servers, but doesn't that lead to race conditions? For example, when the server asks Redis for current values, determines if should be rate limited, and then returns the answer to Redis.


## 6. Resources 

- https://www.youtube.com/watch?v=8QyygfIloMc
- https://smudge.ai/blog/ratelimit-algorithms
- https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
- https://github.com/brandur/redis-cell/
- https://smarketshq.com/implementing-gcra-in-python-5df1f11aaa96
- https://news.ycombinator.com/item?id=40384421
- https://dl.acm.org/doi/pdf/10.1145/1282427.1282419
- https://www.researchgate.net/publication/391435133_AI-Based_Rate_Limiting_for_Cloud_Infrastructure_Implementation_Guide
- https://dl.acm.org/doi/epdf/10.1145/3628034.3628039
