'use strict';

(function () {

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
    set id(id) { this._id = id; }
    get description() { return this._description; }
    set description(description) { this._description = description; }
    get timestamp() { return this._timestamp; }
    set timestamp(ts) { this._timestamp = ts; }
    //@formatter:on
  }

  /**
   * A task that can be synchronized with the REST API.
   */
  class RestTaskModel extends TaskModel {
    /**
     * Instances a new `RestTaskModel`.
     * @param id {number?} Task identifier, can be null for newly created tasks.
     * @param description {string} A description
     * @param client {RestClient} A rest client
     */
    constructor(id, description, client) {
      super(id, description);
      this._client = client;
    }

    toDto() {
      return {id: this.id, description: this.description, timestamp: this.timestamp};
    }

    async create() {
      let dto = this.toDto();
      dto = await this._client.post('task', dto);
      this.id = dto.id;
      this.timestamp = Date.parse(dto.timestamp);
      return this;
    }

    async delete() {
      await this._client.del(`task/${encodeURIComponent(this.id)}`);
      return this;
    }

    async update(newDesc) {
      let dto = {description: newDesc};
      await this._client.put(`task/${encodeURIComponent(this.id)}`, dto);
      this.description = newDesc;
      return this;
    }
  }

  /**
   * Encapsulates the control and view logics behind a single task.
   */
  class TaskComponent extends EventEmitter {
    /**
     * Instances a new `TaskComponent` component.
     * @param model {RestTaskModel} A task model
     */
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

    async save() {
      if (this._edit) {
        const newDesc = (this._edit.querySelector('input').value || '').trim();
        if (newDesc) {
          try {
            console.debug(`Attempting to update task ${this._model.id} with '${newDesc}'...`);
            await this._model.update(newDesc);
          } catch (e) {
            console.log(`Cannot update task ${this._model.id}`);
          }
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

  const tasks = [];
  const client = new RestClient('/api');

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

  async function removeTask(task) {
    try {
      let i = tasks.findIndex(t => t.model.id === task.id);
      if (i >= 0) {
        console.log(`Deleting task ${task.id}...`);
        const {model} = tasks[i];
        await model.delete();
        console.log(`Task ${model.id}, '${model.description}' successfully deleted!`);

        // this must be repeated as other things might have changed
        i = tasks.findIndex(t => t.model.id === task.id);
        const {component} = tasks[i];
        component.destroy();
        tasks.splice(i, 1);
      }
    } catch (e) {
      console.error(`Cannot delete task ${task.id}`, e);
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

  function createTaskComponent(model) {
    const root = document.querySelector('.content .panel .tasks');
    const component = new TaskComponent(model);
    tasks.push({model, component});
    const el = component.init();
    root.appendChild(el);
    component.on('completed', removeTask);
  }

  async function addTask(form) {
    const inp = form.querySelector('input');
    const desc = (inp.value || '').trim();
    if (desc) {
      console.log(`Saving new task '${desc}'...`);
      const model = new RestTaskModel(undefined, desc, client);
      await model.create();
      console.log('Task successfully saved', {model: model.toDto()});
      createTaskComponent(model);
    }
  }

  async function init() {
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

    try {
      const resp = await client.get('tasks');
      resp.results.forEach(dto => {
        const model = new RestTaskModel(dto.id, dto.description, client);
        createTaskComponent(model);
      });
    } catch (e) {
      console.error('Something went wrong getting tasks', e);
    }
  }

  // initializes the components
  init();

})();
