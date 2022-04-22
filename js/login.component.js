(function (win, toast) {

  /**
   * A login component.
   */
  class LoginComponent {
    #element = null;
    #client = null;

    constructor(client) {
      this.#client = client;
    }

    async init() {
      this.#element = document.createElement('div');
      this.#element.className = 'tasks';
      this.#element.innerHTML = document.querySelector('script#login-template').textContent;
    }
  }

  /* Exporting component */
  win.LoginComponent ||= LoginComponent;

})(window, window.toast);
