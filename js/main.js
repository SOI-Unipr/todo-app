(function () {

  class TaskModel {
    constructor(id, description) {
      this._id = id;
      this._description = description;
      this._timestamp = new Date();
    }

    //@formatter:off
  get id() { return this._id; }
  get description() { return this._description; }
  get timestamp() { return this._timestamp; }
  //@formatter:on
  }

  function sequencer() {
    let i = 1;
    return function () {
      const n = i;
      i++;
      return n;
    }
  }

  class TaskComponent {
    constructor(root, model) {
      this._root = root;
      this._model = model;
    }

    render() {
      const task = document.createElement('div');
      task.className = 'task';
      task.innerHTML = document.querySelector('script#task-template').textContent;

      const inp = task.querySelector('input');
      inp.id = `task-${this._model.id}`;
      inp.name = inp.id;
      const lbl = task.querySelector('label');
      lbl.htmlFor = inp.id;
      lbl.textContent = this._model.description;

      this._root.appendChild(task);
    }
  }

  const seq = sequencer();
  const tasks = [];

  function toast(msg, type) {
    let t = document.body.querySelector('.toast');
    if (t) {
      t.remove();
    }
    t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = msg;
    document.body.insertBefore(t, document.body.firstChild);
  }

  function addItem(form) {
    const inp = form.querySelector('input');
    const desc = (inp.value || '').trim();
    if (desc !== '') {
      const root = document.querySelector('.content .panel .tasks');
      const model = new TaskModel(seq(), desc);
      const component = new TaskComponent(root, model);
      tasks.push({model, component});
      component.render();
    }
  }

  function init() {
    const form = document.forms.namedItem('new-task');
    if (!form) {
      toast('Cannot initialize components: no <b>form</b> found', 'error');
    }

    form.addEventListener('submit', function ($event) {
      $event.preventDefault();
      addItem(form);
      form.reset();
    });
  }


  init();

})();
