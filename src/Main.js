import './polyfills'
import Observer from './Observer'
import Emitter from './Emitter'

export default {

  install (Vue, connection, opts = {}) {
    if (!connection) { throw new Error('[vue-native-socket] cannot locate connection') }

    let observer = null

    opts.$setInstance = (wsInstance) => {
      Vue.prototype.$socket = wsInstance
    }

    if (opts.connectManually) {
      Vue.prototype.$connect = (connectionUrl = connection, connectionOpts = opts) => {
        observer = new Observer(connectionUrl, connectionOpts)
        Vue.prototype.$socket = observer.WebSocket
      }

      Vue.prototype.$disconnect = () => {
        if (observer && observer.reconnection) { observer.reconnection = false }
        if (Vue.prototype.$socket) {
          Vue.prototype.$socket.close()
          delete Vue.prototype.$socket
        }
      }
    } else {
      observer = new Observer(connection, opts)
      Vue.prototype.$socket = observer.WebSocket
    }

    const websocketActions = ['onmessage', 'onclose', 'onerror', 'onopen']

    Vue.mixin({
      created () {
        let vm = this
        let sockets = this.$options['sockets']

        this.$options.sockets = {
          _onmessage: [],
          _onclose: [],
          _onerror: [],
          _onopen: [],
          _onSet: function (type, val) {
            if (Array.isArray(val)) {
              val.forEach(() => {
                this['_' + type].push(val)
                Emitter.addListener(type, val, vm)
              })
            } else {
              this._onmessage.push(val)
              Emitter.addListener(type, val, vm)
            }
          },
          set onmessage (val) {
            this._onSet('onmessage', val)
          },
          get onmessage () {
            return this._onmessage
          },
          set onclose (val) {
            this._onSet('onclose', val)
          },
          get onclose () {
            return this._onclose
          },
          set onerror (val) {
            this._onSet('onerror', val)
          },
          get onerror () {
            return this._onerror
          },
          set onopen (val) {
            this._onSet('onopen', val)
          },
          get onopen () {
            return this._onopen
          }
        }

        if (sockets) {
          websocketActions.forEach((key) => {
            this.$options.sockets[key] = sockets[key]
          })
        }
      },
      beforeDestroy () {
        let sockets = this.$options['sockets']
        let vm = this

        if (sockets) {
          websocketActions.forEach((key) => {
            if (Array.isArray(this.$options.sockets[key])) {
              this.$options.sockets[key].forEach((cb) => {
                Emitter.removeListener(key, cb, vm)
              })
              this.$options.sockets[key] = []
            }
          })
        }
      }
    })
  }
}
