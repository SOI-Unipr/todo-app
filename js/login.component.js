`use strict`;

(function (win) {

  /**
   * A login component.
   */
  class LoginComponent {
    #element = null;
    #client = null;
    #handlers = [];

    /**
     * Instances a new `LoginComponent`.
     * @param client {RestClient} The REST client
     */
    constructor(client) {
      this.#client = client;
    }

    destroy() {
      this.#handlers.forEach(h => h.unregister());
      this.#element.remove();
    }

    async init() {
      this.#element = document.createElement('div');
      this.#element.className = 'tasks';
      this.#element.innerHTML = document.querySelector('script#login-template').textContent;

      const btn = this.#element.querySelector('button');
      const hdlr = new Handler('click', btn, () => this.login());
      this.#handlers.push(hdlr);

      return this.#element;
    }

    login() {
      // TODO
    }
  }

  /* Exporting component */
  win.LoginComponent ||= LoginComponent;

})(window);
