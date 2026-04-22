const aid = setInterval(() => {
    console.log(2 + 2)
}, 1000)

setTimeout(() => {
    clearInterval(aid)
}, 10000)