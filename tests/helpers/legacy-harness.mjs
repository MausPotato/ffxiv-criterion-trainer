import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LEGACY_FILE = path.join(ROOT, 'legacy/ketuduke-v4.5.html');

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
  }

  values() {
    return new Set(this.owner.className.split(/\s+/).filter(Boolean));
  }

  write(values) {
    this.owner.className = [...values].join(' ');
  }

  add(...names) {
    const values = this.values();
    names.forEach(name => values.add(name));
    this.write(values);
  }

  remove(...names) {
    const values = this.values();
    names.forEach(name => values.delete(name));
    this.write(values);
  }

  contains(name) {
    return this.values().has(name);
  }

  toggle(name, force) {
    const values = this.values();
    const enabled = force === undefined ? !values.has(name) : Boolean(force);
    if (enabled) values.add(name);
    else values.delete(name);
    this.write(values);
    return enabled;
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.classList = new FakeClassList(this);
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = new Map();
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.onclick = null;
    this.onchange = null;
    this._innerHTML = '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = node => {
      for (const child of node.children) {
        if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 100 };
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    this.parentNode = null;
  }

  click() {
    if (!this.disabled) this.onclick?.({ target: this });
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.listeners = new Map();
    this.arena = new FakeElement('div');
    this.arena.className = 'arena-wrap';

    const ids = [
      'back', 'board', 'boardStart', 'clock', 'closeDeath', 'confirm', 'deathOverlay',
      'deathReason', 'feedback', 'focus', 'hint', 'instruction', 'legendBind',
      'legendBubble', 'mechanic', 'nextDeath', 'progress', 'restart', 'retryDeath',
      'roles', 'round', 'setup', 'showWind', 'stageBadge', 'stageDesc', 'stageName',
      'startGame', 'startPrompt', 'status', 'step', 'streak', 'timed', 'toggleHint',
      'windBanner', 'wins'
    ];
    ids.forEach(id => this.elements.set(id, new FakeElement()));
    this.getElementById('timed').checked = true;
    this.getElementById('showWind').checked = false;
    this.getElementById('focus').value = '';
    this.getElementById('board').parentNode = this.arena;
    this.arena.children.push(this.getElementById('board'));
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  getElementById(id) {
    if (!this.elements.has(id)) this.elements.set(id, new FakeElement());
    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector === '.arena-wrap') return this.arena;
    return null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map(value => value.trim());
    return this.arena.children.filter(element =>
      selectors.some(item => item.startsWith('.') && element.classList.contains(item.slice(1)))
    );
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
}

class FakeScheduler {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.tasks = new Map();
  }

  setTimeout(callback, delay = 0) {
    const id = this.nextId++;
    this.tasks.set(id, { id, at: this.now + Number(delay), callback });
    return id;
  }

  clearTimeout(id) {
    this.tasks.delete(id);
  }

  advanceTo(target) {
    if (target < this.now) throw new Error('Fake time cannot move backwards');
    while (true) {
      const next = [...this.tasks.values()]
        .filter(task => task.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!next) break;
      this.tasks.delete(next.id);
      this.now = next.at;
      next.callback();
    }
    this.now = target;
  }

  advanceBy(milliseconds) {
    this.advanceTo(this.now + milliseconds);
  }
}

function extractLegacyScript(html) {
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (matches.length !== 1) throw new Error(`Expected one inline script, found ${matches.length}`);
  return matches[0][1];
}

function exposeLegacyInternals(script) {
  const marker = '    })();';
  const index = script.lastIndexOf(marker);
  if (index === -1) throw new Error('Could not find the legacy IIFE terminator');
  const bridge = `
      globalThis.__legacyTestApi = {
        ix, rc, quad, autoQueue, candidatePre, solveParty, pushAt, referenceSafe,
        canonicalCrystalFinal, hazards, validateCrystalGeometry, begin, confirm,
        reveal, reset,
        setGame(value) { game = value; },
        getGame() { return game; },
        getState() {
          return {
            ready, lockPosition, elapsed, phase, round, wins, streak, focus,
            queue: { ...queue }, pre: { ...pre }, playerFinal: { ...playerFinal },
            crystalFinal: crystalFinal.map(value => ({ ...value })), mahVisible,
            hasChecked, review, epoch, seconds
          };
        }
      };
`;
  return script.slice(0, index) + bridge + script.slice(index);
}

export function createLegacyHarness({ randomValues = [0] } = {}) {
  const html = fs.readFileSync(LEGACY_FILE, 'utf8');
  const scheduler = new FakeScheduler();
  const document = new FakeDocument();
  let randomIndex = 0;
  const math = Object.create(Math);
  math.random = () => randomValues[randomIndex++ % randomValues.length];
  const NativeDate = Date;
  class FakeDate extends NativeDate {
    static now() {
      return scheduler.now;
    }
  }

  const context = vm.createContext({
    console,
    document,
    Math: math,
    Date: FakeDate,
    setTimeout: (callback, delay) => scheduler.setTimeout(callback, delay),
    clearTimeout: id => scheduler.clearTimeout(id),
    requestAnimationFrame: callback => scheduler.setTimeout(callback, 16)
  });
  vm.runInContext(exposeLegacyInternals(extractLegacyScript(html)), context, {
    filename: LEGACY_FILE
  });

  return {
    api: context.__legacyTestApi,
    document,
    scheduler,
    element: id => document.getElementById(id),
    boardTile: index => document.getElementById('board').children[index]
  };
}
