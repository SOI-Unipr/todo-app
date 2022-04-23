`use strict`;

(function (win) {

  /**
   * A login component.
   */
  class LoginComponent extends EventEmitter {
    /** @type {HTMLElement} */
    #element;
    /** @type {RestClient} */
    #client;
    /** @type {Handler[]} */
    #handlers = [];

    /**
     * Instances a new `LoginComponent`.
     * @param client {RestClient} The REST client
     */
    constructor(client) {
      super();
      this.#client = client;
    }

    /**
     * Destroys this component, removing it from it's parent node.
     */
    destroy() {
      this.#handlers.forEach(h => h.unregister());
      this.#element.remove();
    }

    /**
     * Initializes the component.
     * @return {Promise<HTMLElement>} The root element for this component.
     */
    async init() {
      this.#element = document.createElement('div');
      this.#element.className = 'tasks';
      this.#element.innerHTML = document.querySelector('script#login-template').textContent;

      const btn = this.#element.querySelector('button');
      const hdlr = new Handler('click', btn, () => this.login());
      this.#handlers.push(hdlr);

      // noinspection ES6MissingAwait
      this.getTokensIfAuthorized();

      return this.#element;
    }

    /**
     * Looks into the header, is there something we got back from Google?
     * Something like this:
     *  state=["11??11","http://localhost:9000/"]
     *  &code=4/0AX4XfWhB???????K1LBxePQ
     *  &scope=email+https://www.googleapis.com/auth/userinfo.email+openid
     *  &authuser=0
     *  &prompt=consent
     */
    async getTokensIfAuthorized() {
      const url = new URL(document.URL);
      const state = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      if (!state || !code) {
        return;
      }

      let nonce;
      try {
        nonce = JSON.parse(state)[0];
      } catch (e) {
        console.error('💢 Cannot parse nonce and URL in state param', state);
      }
      if (localStorage.getItem('nonce') !== nonce) {
        console.warn('💢 Nonce differs from saved one, aborting login');
        return;
      }

      const {id_token, access_token, refresh_token} = await this.#client.get('/tokens', {code});
      console.info('🔒 User successfully logged in!');
      const page = localStorage.getItem('state');
      localStorage.setItem('id_token', id_token);
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.removeItem('nonce');
      localStorage.removeItem('state');
      this.emit('authenticated', {id_token, access_token, refresh_token, page});
    }

    login() {
      const nonce = (Math.random() * 900_000 + 100_000).toFixed();
      const state = document.location;
      localStorage.setItem('nonce', nonce);
      localStorage.setItem('state', state);
      const url = new URL(document.URL);
      url.pathname = '/api/login';
      url.searchParams.append('nonce', nonce);
      url.searchParams.append('state', state);
      console.debug('Redirecting to login URL...');
      window.location = url.href;
    }
  }

  /* Exporting component */
  win.LoginComponent ||= LoginComponent;

})(window);
