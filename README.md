Dynamic Deno toy
---

_warning_: This doesn't actually work in deno deploy due to the worker API seemingly not being supported there (probably with good reason).

This is a simple example of trying to provide a somewhat isolated runtime to dynamically run a program in the cycle of a request.

```
git clone git@github.com:NickTomlin/dynamic-deno.git
cd dynamic-deno
deno run --unstable -A server.js

# In a separate terminal or tmux pane
curl http://localhost:8000/run/adder -X POST --data '{ "a": 1, "b": 2, "c": 3}'
curl http://localhost:8000/run/greeter -X POST --data '{ "name": "Deno"}'
```

## Why?

Deno's abilty to sandbox execution, and it's relative ease of use, makes it a perfect fit for domain specific runtimes.


### Prior art

- Deno deploy ;) 
- https://github.com/laverdet/isolated-vm
- https://www.graalvm.org/
