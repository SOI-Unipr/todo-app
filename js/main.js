'use strict';

(function () {

  /**
   * Creates a new sequence function.
   * @return {function(): number} A function that returns sequences of numbers on each call
   */
  function sequencer() {
    let i = 1;
    return function () {
      const n = i;
      i++;
      return n;
    }
  }

  /**
   * An event handler that keeps track of the callback reference added
   * to an HTML element using `addEventListener` and removed with
   * `removeEventListener`.
   */
  class Handler {
    /**
     * Instances a new `Handler` and registers the `callback` function
     * for the specified `event` at the `element` level.
     * @param event {string} The event name
     * @param element {HTMLElement} An HTML element
     * @param callback {Function} The function to be invoked on `event`
     */
    constructor(event, element, callback) {
      this._event = event;
      this._element = element;
      this._callback = callback;
      this._element.addEventListener(this._event, this._callback);
    }

    //@formatter:off
    get event() { return this._event; }
    get element() { return this._element; }
    get callback() { return this._callback; }
    //@formatter:on

    /**
     * Unregisters this handler.
     */
    unregister() {
      this._element.removeEventListener(this._event, this._callback);
    }
  }

  /**
   * An entity that is able to emit events certain subscribers are
   * interested into.
   */
  class EventEmitter {
    constructor() {
      this._subscribers = [];
      this._seq = sequencer();
    }

    /**
     * Adds a new subscriber for the specified event.
     * @param event
     * @param callback
     */
    on(event, callback) {
      const id = this._seq();
      this._subscribers.push({id, event, callback});
      return {
        unsubscribe: this._unsubscribe.bind(this)
      };
    }

    _unsubscribe(anId) {
      const j = this._subscribers.findIndex(s => s.id === anId);
      if (j >= 0) {
        this._subscribers.splice(j, 1);
      }
    }

    /**
     * Emits an event. This immediately triggers any callback that has
     * been subscribed for the exact same event.
     * @param event {string} The event name
     * @param data {Object?} Any additional data passed to the callback.
     */
    emit(event, data) {
      this._subscribers
        .filter(s => s.event === event)
        .forEach(s => s.callback(data));
    }
  }

  /**
   * A task.
   */
  class TaskModel {
    constructor(id, description) {
      this._id = id;
      this._description = description;
      this._timestamp = new Date();
    }

    //@formatter:off
    get id() { return this._id; }
    get description() { return this._description; }
    set description(description) { this._description = description; }
    get timestamp() { return this._timestamp; }
    //@formatter:on
  }

  /**
   * Encapsulates the control and view logics behind a single task.
   */
  class TaskComponent extends EventEmitter {
    constructor(model) {
      super();
      this._model = model;
      this._element = null;
      this._handlers = [];
      this._edit = null;
    }

    destroy() {
      this._handlers.forEach(h => h.unregister());
      this._element.remove();
    }

    init() {
      this._element = document.createElement('div');
      this._element.className = 'task';
      this._element.innerHTML = document.querySelector('script#task-template').textContent;

      const inp = this._element.querySelector('input');
      inp.id = `task-${this._model.id}`;
      inp.name = inp.id;
      const lbl = this._element.querySelector('label');
      lbl.htmlFor = inp.id;
      lbl.textContent = this._model.description;

      const editBtn = this._element.querySelector('.task-right button[name=edit]');
      let hdlr = new Handler('click', editBtn, () => this.edit());
      this._handlers.push(hdlr);

      const compBtn = this._element.querySelector('.task-right button[name=complete]');
      hdlr = new Handler('click', compBtn, () => this.complete());
      this._handlers.push(hdlr);

      return this._element;
    }

    edit() {
      if (this._edit) {
        this._edit.classList.remove('hidden');
      } else {
        this._edit = document.createElement('div');
        this._edit.className = 'task-edit';
        this._edit.innerHTML = document.querySelector('script#task-edit-template').textContent;

        const btnSave = this._edit.querySelector('button[name=save]');
        let hdlr = new Handler('click', btnSave, () => this.save());
        this._handlers.push(hdlr);

        const btnCancel = this._edit.querySelector('button[name=cancel]');
        hdlr = new Handler('click', btnCancel, () => this.cancel());
        this._handlers.push(hdlr);
      }

      const inp = this._edit.querySelector('input');
      inp.value = this._model.description;

      const children = [
        this._element.querySelector('.task-left'),
        this._element.querySelector('.task-right')];

      children.forEach(c => c.classList.add('hidden'));
      this._element.append(this._edit);
    }

    save() {
      if (this._edit) {
        const newDesc = this._edit.querySelector('input').value || '';
        if (newDesc.trim()) {
          this._model.description = newDesc.trim();
        }
        this._update();
        this._hideEditField();
      }
    }

    cancel() {
      this._hideEditField();
    }

    complete() {
      this.emit('completed', this._model);
    }

    _hideEditField() {
      if (this._edit) {
        this._edit.classList.add('hidden');
      }

      const children = [
        this._element.querySelector('.task-left'),
        this._element.querySelector('.task-right')];
      children.forEach(c => c.classList.remove('hidden'));
    }

    _update() {
      if (this._element) {
        const lbl = this._element.querySelector('label');
        lbl.textContent = this._model.description;
      }
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

  function removeTask(task) {
    const i = tasks.findIndex(t => t.model.id === task.id);
    if (i >= 0) {
      const {component} = tasks[i];
      component.destroy();
      tasks.splice(i, 1);
    }
  }

  function taskIdOf(el) {
    const idStr = el.id.substr(5 /*'task-'.length*/);
    return parseInt(idStr, 10);
  }

  function removeSelectedTasks() {
    const inps = document.querySelectorAll('.task-left input[type=checkbox]:checked');
    const tasks = Array.prototype.slice.apply(inps).map(el => ({id: taskIdOf(el)}));
    tasks.forEach(removeTask);
  }

  function addTask(form) {
    const inp = form.querySelector('input');
    const desc = (inp.value || '').trim();
    if (desc !== '') {
      const root = document.querySelector('.content .panel .tasks');
      const model = new TaskModel(seq(), desc);
      const component = new TaskComponent(model);
      tasks.push({model, component});
      const el = component.init();
      root.appendChild(el);
      component.on('completed', removeTask);
    }
  }

  function init() {
    const form = document.forms.namedItem('new-task');
    if (!form) {
      toast('Cannot initialize components: no <b>form</b> found', 'error');
    }

    form.addEventListener('submit', function ($event) {
      $event.preventDefault();
      addTask(form);
      form.reset();
    });

    const a = document.querySelector('a[data-action=complete-selected]');
    a.addEventListener('click', function ($event) {
      $event.preventDefault();
      removeSelectedTasks();
    });
  }


  init();

})();
