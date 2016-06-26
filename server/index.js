const express = require('express')
var bodyParser = require('body-parser');


const app = express()
const port = process.env.port || 3000

app.use(bodyParser.json())

const cp = require('child_process')

app.use(function(req, res, next){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

    // Request methods you wish to allow
    res.setHeader(
        'Access-Control-Allow-Methods'
        , 'GET, POST, OPTIONS, PUT, PATCH, DELETE'
    )

    next()
})

const sessions = {}

app.post('/sessions', function (req, res) {
    const app = req.body

    if( sessions[app.id] ){
        res.status(500).json({ message: 'App is already running' })
    } else {

        const script = app.script.split('\n').join(' ')

        const process =
            cp.exec(
                script, { cwd: app.cwd }
            )

        process.on('exit', function(){
            console.log('App', app.id, 'closed')
            delete sessions[app.id]
        })

        sessions[app.id] = process

        res.json(app)
    }
});

app.get('/sessions', function(req, res){
    res.json({
        sessions: Object.keys(sessions)
    })
})

app.delete('/sessions/:id', function(req, res){
    const session = sessions[req.params.id]

    if(!sessions[req.params.id]){
        res.status(400)
            .json({
                message: 'App is not running.'
            })

    } else {
        session.kill()
        delete sessions[req.params.id]
        res.json({})
    }
})

app.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
});