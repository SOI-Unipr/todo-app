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
    set id(id) { this._id = id; }
    get description() { return this._description; }
    set description(description) { this._description = description; }
    get timestamp() { return this._timestamp; }
    set timestamp(ts) { this._timestamp = ts; }
    //@formatter:on
  }

  function endRemoveAndTrim(str, char) {
    if (str) {
      str = str.trimRight();
      while (str && str[str.length - 1] === char) {
        str = str.substr(0, str.length - 1).trimRight();
      }
    }
    return str;
  }

  function startRemoveAndTrim(str, char) {
    if (str) {
      str = str.trimLeft();
      while (str && str[0] === char) {
        str = str.substr(1, str.length - 1).trimLeft();
      }
    }
    return str;
  }

  function mkUrl(baseUrl, path, queryParams) {
    const bu = endRemoveAndTrim((baseUrl || '').trim(), '/');
    const p = startRemoveAndTrim(path.trim(), '/');
    let url = [bu, p].join('/');
    if (queryParams && typeof queryParams === 'object') {
      const params = [];
      for (let key of Object.keys(queryParams)) {
        const k = encodeURIComponent(key);
        const val = queryParams[key];
        if (val) {
          let v = encodeURIComponent(val);
          params.push(`${k}=${v}`);
        } else {
          params.push(k)
        }
      }
      if (params.length) {
        url += '?' + params.join('&');
      }
    }

    return url;
  }

  function handleJsonResponse(req, resolve, reject) {
    if (req.readyState === XMLHttpRequest.DONE) {
      // Everything is good, the response was received.
      if (req.status === 200 || req.status === 201) {
        const hdr = req.getResponseHeader('Content-type');
        if (hdr.substr(0, 16) === 'application/json' || hdr.substr(0, 9) === 'text/json') {
          resolve(JSON.parse(req.responseText));
        } else {
          const e = new Error('Not a JSON response');
          e.status = req.status;
          e.response = req.responseText;
          reject(e);
        }
      } else {
        const hdr = req.getResponseHeader('Content-type');
        const e = new Error('Operation failed');
        e.status = req.status;
        if (hdr === 'application/json' || hdr === 'text/json') {
          e.json = JSON.parse(req.responseText);
        } else {
          e.response = req.responseText;
        }
        reject(e);
      }
    }
  }

  function setHeaders(req, headers) {
    if (headers && typeof headers === 'object') {
      for (let key of Object.keys(headers)) {
        req.setRequestHeader(key, headers[key]);
      }
    }
  }

  /**
   * A minimal AJAX client for RESTful APIs.
   */
  class RestClient {
    /**
     * Instances a new `RestClient`.
     * @param baseUrl {string?} Optional baseUrl
     */
    constructor(baseUrl) {
      this._baseUrl = baseUrl;
    }

    /**
     * Sends an AJAX request for the specified `method`.
     * @param method {'GET'|'POST'|'PUT'|'DELETE'} HTTP method
     * @param path {string} The URL path to be appended to this `baseUrl`
     * @param body {Object?} Optional body of the message, will be converted to JSON if present
     * @param queryParams {Object?} Optional query parameters
     * @param headers {Object?} Optional headers
     * @return {Promise} A promise of the JSON response.
     * @private
     */
    _send(method, path, body, queryParams, headers) {
      return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();

        // prepares the response handler
        req.onreadystatechange = () => handleJsonResponse(req, resolve, reject);
        req.open(method, mkUrl(this._baseUrl, path, queryParams));

        // populates additional headers
        setHeaders(req, headers);

        // send request
        if (body) {
          req.setRequestHeader('Content-Type', 'application/json');
          req.send(JSON.stringify(body));
        } else {
          req.send();
        }
      });
    }

    /**
     * Sends a GET request.
     * @param path {string} URL path to be appended to base URL.
     * @param queryParams {Object?} Optional query parameters
     * @param headers {Object?} Optional headers
     * @return {Promise} A promise of the JSON response.
     */
    get(path, queryParams, headers) {
      return this._send('GET', path, null, queryParams, headers);
    }

    /**
     * Sends a POST request.
     * @param path {string} URL path to be appended to base URL.
     * @param body {Object?} Optional body of the message, will be converted to JSON if present
     * @param queryParams {Object?} Optional query parameters
     * @param headers {Object?} Optional headers
     * @return {Promise} A promise of the JSON response.
     */
    post(path, body, queryParams, headers) {
      return this._send('POST', path, body, queryParams, headers);
    }

    /**
     * Sends a PUT request.
     * @param path {string} URL path to be appended to base URL.
     * @param body {Object?} Optional body of the message, will be converted to JSON if present
     * @param queryParams {Object?} Optional query parameters
     * @param headers {Object?} Optional headers
     * @return {Promise} A promise of the JSON response.
     */
    put(path, body, queryParams, headers) {
      return this._send('PUT', path, body, queryParams, headers);
    }

    /**
     * Sends a DELETE request.
     * @param path {string} URL path to be appended to base URL.
     * @param queryParams {Object?} Optional query parameters
     * @param headers {Object?} Optional headers
     * @return {Promise} A promise of the JSON response.
     */
    del(path, queryParams, headers) {
      return this._send('DELETE', path, null, queryParams, headers);
    }
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


  init();

})();
