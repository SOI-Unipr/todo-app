'use strict';

(async function (RestClient, TasksComponent) {
  const ROOT = document.querySelector('.content #root');

  async function replaceChildrenWith(root, elem) {
    // removes any child already present
    for (const child of root.children) {
      child.remove();
    }
    await root.appendChild(elem);
  }

  async function init() {
    const client = new RestClient('/api');
    // const token = localStorage.getItem('token');
    let elem;
    // if (token) {
      // initialize the tasks
      const tasks = new TasksComponent(client);
      elem = await tasks.init();
    // } else {
      // initialize the login panel
      // const login = new LoginComponent(client);
      // elem = login.init();
    // }

    await replaceChildrenWith(ROOT, elem);

  }

  // initializes the components
  await init();
  console.info('🏁 Application initialized');

})(window.RestClient, window.TasksComponent);
