'use strict';

(async function () {
  const client = new RestClient('/api');
  const root = document.querySelector('.content #root');
  /** @type {{init:()=>Promise<HTMLElement>,destroy:()=>void}[]} */
  const components = [];
  /** @type {{unsubscribe:() => void}|null} */
  let subscription = null;

  async function init() {
    const token = localStorage.getItem('id_token');
    let elem, /** @type {{init:()=>Promise<HTMLElement>,destroy:()=>void}} */ comp;
    if (token) {
      // initializes the tasks
      comp = new TasksComponent(client);
      if (subscription) {
        subscription.unsubscribe();
      }
      subscription = null;
    } else {
      // initializes the login panel
      comp = new LoginComponent(client);
      subscription = comp.on('authenticated', init);
    }

    elem = await comp.init();
    components.forEach(c => c.destroy());
    await root.appendChild(elem);
    components.push(comp);
  }

  // initializes the components
  await init();
  console.info('🏁 Application initialized');

})();
