/* globals document,URL,fetch, setTimeout,console */

const m = require('mithril')
const R = require('ramda')
const j2c = require('j2c')
const co = require('co')
const Dexie = require('dexie')
const getDataURI = require('./getdatauri')
const db = new Dexie("Launcher")
const flyd = require('flyd')
const mergeAll = require('flyd/module/mergeall')
const uuid = require('node-uuid').v4


db.version(2).stores({
    apps: "[id],name,image,cwd,script"
})

db.version(1).stores({
    apps: "id,name,image,cwd,script"
    ,images: '++id,src'
    ,sessions:'++id,app,start,end'
})

global.db = db

const style = j2c.sheet({
    'body' : {
        overflow: 'hidden'
        ,margin: '0px'
        ,minHeight: '100vw'
    }
    ,'.button':{
        fontSize: '1.1em'
        ,lineHeight: '3em'
        ,border: 'none'
        ,width: '100%'
        ,':disabled': {
            opacity: 0.5
        }
        ,':focus': {
            outline: 'none'
        }
        ,':hover': {
            opactiy: 0.9
        }
        ,':active': {
            opacity: 0.5
        }
    }
    ,'a': {
        color: 'inherit'
    }
    ,'*' : {
        'font-family': 'Helvetica'
        ,boxSizing: 'border-box'
    }
    ,'.input_subtle': {
        width: '100%'
        ,fontSize: '1em'
        ,textAlign: 'center'
        ,color: 'inherit'
        //  input:not([type=submit]):not([type=file]),textarea {
        ,border: 'none'
        ,padding: '15px'
        ,background: 'none'
        ,margin: '0 0 10px 0'
        ,':focus': {
            outline: 'none'
        }
        ,fontStyle: 'italic'
    }
    ,'.input': {
        width: '100%'
        ,fontSize: '1.5em'
        ,color: 'black'
        //  input:not([type=submit]):not([type=file]),textarea {
        ,border: '5px solid white'
        ,boxShadow:
            'inset 0 0 8px  rgba(0,0,0,0.1), 0 0 16px rgba(0,0,0,0.1)'
        ,padding: '15px'
        ,background: 'rgba(255,255,255,0.5)'
        ,margin: '0 0 10px 0'
    }
    ,'.container' : {
        'padding-right': '2rem'
        ,'padding-left': '2rem'
        ,position: 'absolute'
        ,top: '3em'
        ,height: 'calc(100vh - 4em)'
        ,overflow: 'auto'
        ,width: '100%'
    }
    ,'.vert-center' : {
        display: 'flex', 'align-items': 'center', 'justify-content': 'center'
    }
    ,'.center': {
        textAlign: 'center'
    }
    ,'*::-webkit-scrollbar': {
        display: 'none'
    }
    ,'.color_main' : {
        backgroundColor: '#f88181'
        ,color: 'white'
    }
    ,'.color_muted': {
        color: 'darkgray'
    }
    ,'.color_empty' : {
        backgroundColor: 'aliceblue'
    }
    ,'.margin': {
        margin: '1em'
    }
    ,'.shadow' : {
        boxShadow: '2px 5px 10px rgba(0,0,0,0.1)'
    }
    ,'.nav': {
        lineHeight: '3em'
        ,height: '3em'
        ,width: '100vw'
        ,position: 'fixed'
        ,top: '0px'
        ,padding: '0em 1em 0em 1em'
    }
    ,'.file' : {
        width: '100%'
        ,height: '100%'
    }
    ,'.hidden' : {
        display: 'none'
    }
    ,'.box': {
        width: '10em'
        ,height: '12em'
        ,backgroundColor: 'lightslategray'
    }
})

const C = R.flip
const K = R.always
const S = (a,b) => (data) => a(b(data), data)
const map = R.map

const css = R.pipe(
    R.split(' ')
    ,R.map(
        S(
            R.or
            ,C(R.prop)(style)
        )
    )
    ,R.join('.')
    ,R.concat('.')
)

global.style = style
global.R = R
global.css = css
global.flyd = flyd

const M = R.curryN(2,m)
const M2 = R.curryN(3,m)

// Content[][] -> FlexboxGrid Content
const grid = R.compose(
    M2('div', { style: { width: '100%' } })
        ,map(M('div.row around-xs'))
            ,map(
                map(
                    M('div.col-xs row around-xs')
                )
            )
)

const dropzone = function(attrs, image){

    return m('label', attrs
        ,m('input[type=file] '+css('hidden file'), {
            onchange: function(){
                const url = URL.createObjectURL(this.files[0])

                getDataURI(url)
                    .then(image)
                    .then(m.redraw)
            }
        })
    )
}

const box = function( app ){
    return m('div'
        ,m('a', {
            href: '/launch/'+app.id
            ,config: m.route
            ,style: { textDecoration: 'none' }
        }
            ,m('div'+css('box shadow'), {
                    style: {
                        backgroundImage: 'url('+app.image+')'
                        ,backgroundPosition: 'center'
                        ,backgroundSize: 'cover'
                    }
                }
            )
        )
        ,m('a', {
            href: '/edit/'+app.id
            ,config: m.route
            ,style: { margin: '1em', textDecoration: 'none' }
        }

            ,m('h2'+css('center'), {
                style: { color: 'hsla(-376,89%,74%,1)' }
            }
                ,m('span', app.name+' ')
                ,m('i' + css('fa.fa-cog') )
            )
        )
    )
}

function link({ title, href }){
    return href
        ? m('a'
            ,{ href, config: m.route}
            ,m('span', title())
        )
        : m('span', title())
}

const Apps = flyd.stream()
const AppIndex = flyd.stream({})

const App = function(app={}){
    return {
        id: flyd.stream(app.id)
        ,name: flyd.stream(app.name || 'Untitled')
        ,image: flyd.stream(app.image || '')
        ,cwd: flyd.stream(app.cwd || '')
        ,script: flyd.stream(app.script || '')
        ,toJSON: function(){
            return R.map( v=> v(), this)
        }
    }
}

function input(type, prop, classes='input', attrs={}){

    return m('input'+css(classes), R.merge(attrs, {
            type: type
            , oninput: m.withAttr('value', prop)
            , value: prop()
        }))
}

function textArea(prop){
    return m('textarea'+css('input'), {
        onchange: m.withAttr('value', prop)
        ,value: prop()
    })
}

function row(children){
    children = [].concat(children)
     return m('div.row',children.map(
         child => m('div.col-xs', child)
     ))
}

function Delete(){

    return function view(){

        const id = m.route.param('id')

        db.apps.delete(id)
            .then(function(){
                m.route('/')
            })
            .catch(function(error){
                message = "Could not delete Application"
                console.error(error)
                setTimeout(function(){
                    m.route('/')
                }, 2000)
            })


        const app = AppIndex()[id]
        const message =
            app
            ? 'Deleting '+app.name
            : 'Deleting Application'

        return m('div'
            ,m('style', style)
            ,m('div'+css('container vert-center')
                ,m('h1'+css('center color_muted'), message)
            )
            ,m('div'+css('color_main shadow nav'))
        )
    }
}


function launch(app){
    return api('/sessions', 'POST', R.omit(['image'],app.toJSON()))
}
function quit(app){
    return api('/sessions/'+app.id(), 'DELETE', {})
}
function sessions(){
    return api('/sessions', 'GET', {})
}

const api = (url, method, body) =>
    fetch('http://localhost:3000'+url, {
        headers: {
            'Accept': 'application/json'
            ,'Content-Type': 'application/json'
        }
    ,body: JSON.stringify( body )
    ,method: method
    ,mode: "cors"
    })
    .then( res => res.json() )


function Launch(){

    const id = m.route.param('id')
    let app = App(AppIndex()[id])

     db.apps.toArray()
        .then(R.tap(Apps))
        .then(R.indexBy(R.prop('id')))
        .then(AppIndex)
        .then(function(){
            app = App(AppIndex()[id])
            launch(app)
        })
        .then(m.redraw)

    const navs = () => [
        link({ title: K('Done'), href: '/' })
    ]

    return function view(){
        return m('div'
            ,m('style', style)
            ,m(css('container')

                ,m('div.row.center-xs'
                    ,m('div.col'
                        ,m('h1', 'Launching '+app.name())
                    )
                )
                ,m('div.row.center-xs'+css('margin')
                    ,m('div.col'+css('shadow')

                        ,m('div', (
                                { className: style.color_main
                                , style: {
                                        backgroundImage: 'url('+app.image()+')'
                                        ,backgroundPosition: 'center'
                                        ,backgroundSize: 'cover'
                                        ,width: '20em'
                                        ,height: '25em'
                                        ,display: 'block'
                                    }
                                }
                            )
                        )
                    )
                )
            )
            ,m('div'+css('color_main shadow nav')
                ,grid([
                    navs()
                ])
            )
        )
    }
}

function Edit(){

    const id = m.route.param('id')

    let app = App(AppIndex()[id])
    const disabled = flyd.stream()

    db.apps.toArray()
        .then(R.tap(Apps))
        .then(R.indexBy(R.prop('id')))
        .then(AppIndex)
        .then(function(){
            app = App(AppIndex()[id])
            global.app = app

             flyd.combine(function(){
                 const json = app.toJSON()

                 if( !json.id ){
                     delete json.id
                 }
                 if( app.id() ){
                     db.apps.put(json)
                 } else {
                     app.id(json.id = uuid())
                     db.apps.add(json)
                        .then(function(){
                            m.route(
                                '/edit/'+json.id
                            )
                        })
                 }

            }, [
                app.cwd
                ,app.image
                ,app.name
                ,app.script
            ])
        })
        .then(_ => m.redraw())


    const navs = () => [
        link({ title: K('Done'), href: '/' })
        ,input('text', app.name, 'input_subtle')
        ,id ? link({ title: K('Delete'), href: '/delete/'+id }) : m('div')
    ]

    return function view(){

        return m('div'
            ,m('style', style)
            ,m('div'+css('container')

                ,m('div.row.center-xs'+css('margin')
                    ,m('div.col'+css('shadow')

                        ,dropzone(
                            { className: style.color_main
                            , style: {
                                    backgroundImage: 'url('+app.image()+')'
                                    ,backgroundPosition: 'center'
                                    ,backgroundSize: 'cover'
                                    ,width: '20em'
                                    ,height: '25em'
                                    ,display: 'block'
                                }
                            }
                            ,app.image
                        )
                    )
                )
                ,row( m('p', 'Application Name') )
                ,row( input('text', app.name))
                ,row( m('p', 'Command Directory') )
                ,row( input('text', app.cwd ) )
                ,row( m('p', 'Command') )
                ,row( textArea(app.script) )
                ,row([
                    m('button'+css('button color_main'), R.merge(
                        disabled() ? { disabled: true } : {}
                        ,{
                            onclick: function(){
                                disabled(true)
                                launch(app)
                                    .catch(function(){
                                        disabled(false)
                                    })
                                    .then(m.redraw)
                            }
                        }
                    ), 'Test Command')
                    ,m('button'+css('button'), R.merge(
                        disabled() ? {} : { disabled: true }
                        ,{
                            onclick: function(){
                                quit(app)
                                    .then(function(){
                                        disabled(false)
                                    })
                                    .then(m.redraw)

                            }
                        }
                    ), 'Kill Process')
                ])
            )
            ,m('div'+css('color_main shadow nav')
                ,grid([
                    navs()
                ])
            )
        )
    }
}

function Home (){

    db.apps.toArray()
        .then(R.tap(Apps))
        .then(R.indexBy(R.prop('id')))
        .then(AppIndex)
        .then(m.redraw)

    return function view()  {

        const navs = [
            link({ title: K('Create'), href: '/edit' })
        ]

        return m('div'
            ,m('style', style)
            ,m('div'+css('container vert-center')
                ,Apps()
                    ? Apps().length
                        ? grid([ Apps().map(box) ])
                        : m('h1'+css('center color_muted'), m('a',{ href: '/edit', config: m.route }, 'Create an App'))
                    : m('h1'+css('center color_muted'), 'Loading')
            )
            ,m('div'+css('color_main shadow nav')
                ,grid([
                    navs
                ])
            )
        )
    }
}

function component(closure ) {
    return {
        controller: closure
        ,view: v => v()
    }
}

const routes = {
    '/': component(Home)
    ,'/launch/:id': component(Launch)
    ,'/edit/:id': component(Edit)
    ,'/edit': component(Edit)
    ,'/delete/:id': component(Delete)
}

m.route(document.body, '/', routes)