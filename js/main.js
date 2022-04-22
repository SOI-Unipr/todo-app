'use strict';

(async function (RestClient, TasksComponent) {
  const root = document.querySelector('.content #root');
  const components = [];

  async function init() {
    const client = new RestClient('/api');
    const token = localStorage.getItem('token');
    let elem, comp;
    if (token) {
      // initialize the tasks
      comp = new TasksComponent(client);
    } else {
      // initialize the login panel
      comp = new LoginComponent(client);
    }

    elem = await comp.init();
    components.forEach(c => c.destroy());
    await root.appendChild(elem);
    components.push(comp);
  }

  // initializes the components
  await init();
  console.info('🏁 Application initialized');

})(window.RestClient, window.TasksComponent);
