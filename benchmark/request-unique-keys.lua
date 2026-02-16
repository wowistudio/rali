counter = 0
request = function()
   counter = counter + 1
   wrk.method = "POST"
   wrk.body   = string.format('{"key":"benchmark-key-%d","limit":100,"window":60}', counter)
   wrk.headers["Content-Type"] = "application/json"
   return wrk.format()
end
