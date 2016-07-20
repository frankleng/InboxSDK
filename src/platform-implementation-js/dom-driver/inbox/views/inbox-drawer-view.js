/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import InboxBackdrop from './inbox-backdrop';
import type {DrawerViewOptions} from '../../../driver-interfaces/driver';
import findParent from '../../../lib/dom/find-parent';

class InboxDrawerView {
  _chrome: boolean;
  _exitEl: HTMLElement;
  _containerEl: HTMLElement;
  _el: HTMLElement;
  _backdrop: InboxBackdrop;
  _slideAnimationDone: Kefir.Stream;
  _closing: Kefir.Stream&{destroy():void} = kefirStopper();
  _closed: Kefir.Stream&{destroy():void} = kefirStopper();

  constructor(options: DrawerViewOptions) {
    this._chrome = typeof options.chrome === 'boolean' ? options.chrome : true;

    const zIndex = 500;
    let target = document.body;

    const {composeView} = options;
    if (composeView) {
      if (composeView.isMinimized()) {
        throw new Error("Can't attach DrawerView to minimized ComposeView");
      }
      if (composeView.isInlineReplyForm()) {
        throw new Error("Can't attach DrawerView to inline ComposeView");
      }
      Kefir.merge([
        Kefir.fromEvents(composeView, 'destroy'),
        Kefir.fromEvents(composeView, 'minimized'),
        Kefir.fromEvents(composeView, 'restored'),
        Kefir.fromEvents(composeView, 'fullscreenChanged'),
      ])
        .takeUntilBy(this._closing)
        .onValue(() => this.close());
      const {offsetParent} = composeView.getElement();
      if (!(offsetParent instanceof HTMLElement)) throw new Error('should not happen');
      target = findParent(
        offsetParent,
        el => window.getComputedStyle(el).getPropertyValue('z-index') !== 'auto'
      ) || document.body;
      const id = `${Date.now()}-${Math.random()}`;
      target.setAttribute('data-drawer-owner', id);
      target.style.zIndex = '500';
      offsetParent.setAttribute('data-drawer-owner', id);
      if (!offsetParent.hasAttribute('data-drawer-old-zindex')) {
        offsetParent.setAttribute('data-drawer-old-zindex', offsetParent.style.zIndex);
      }
      offsetParent.style.zIndex = String(zIndex+1);
      this._closed.onValue(() => {
        if (target.getAttribute('data-drawer-owner') === id) {
          target.style.zIndex = '';
          target.removeAttribute('data-drawer-owner');
        }
        if (offsetParent.getAttribute('data-drawer-owner') === id) {
          offsetParent.style.zIndex = offsetParent.getAttribute('data-drawer-old-zindex');
          offsetParent.removeAttribute('data-drawer-owner');
          offsetParent.removeAttribute('data-drawer-old-zindex');
        }
      });
    }

    this._backdrop = new InboxBackdrop(zIndex, target);
    this._backdrop.getStopper().takeUntilBy(this._closing).onValue(() => {
      this.close();
    });

    this._containerEl = document.createElement('div');
    this._containerEl.className = 'inboxsdk__drawer_view_container';
    this._containerEl.style.zIndex = String(zIndex+2);

    this._el = document.createElement('div');
    this._el.setAttribute('role', 'dialog');
    this._el.tabIndex = 0;
    this._el.className = 'inboxsdk__drawer_view';
    this._containerEl.appendChild(this._el);

    if (this._chrome) {
      const titleBar = document.createElement('div');
      titleBar.className = 'inboxsdk__drawer_title_bar';

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.title = 'Close';
      closeButton.className = 'inboxsdk__close_button';
      (closeButton:any).addEventListener('click', () => {
        this.close();
      });
      titleBar.appendChild(closeButton);

      const title = document.createElement('div');
      title.className = 'inboxsdk__drawer_title';
      title.setAttribute('role', 'heading');
      title.textContent = options.title;
      titleBar.appendChild(title);

      this._el.appendChild(titleBar);
    }

    this._el.appendChild(options.el);

    target.appendChild(this._containerEl);

    this._closing.onValue(() => {
      this._backdrop.destroy();
      this._el.classList.remove('inboxsdk__active');
      Kefir.fromEvents(this._el, 'transitionend')
        .merge(Kefir.later(200)) // transition might not finish if element is hidden
        .take(1)
        .onValue(() => {
          this._closed.destroy();
          this._containerEl.remove();
        });
    });

    this._el.offsetHeight; // force layout so that adding this class does a transition.
    this._el.classList.add('inboxsdk__active');
    this._slideAnimationDone = Kefir.fromEvents(this._el, 'transitionend')
      .take(1)
      .takeUntilBy(this._closing)
      .map(() => null);
  }

  getSlideAnimationDone() {
    return this._slideAnimationDone;
  }

  getClosingStream() {
    return this._closing;
  }

  getClosedStream() {
    return this._closed;
  }

  close() {
    this._closing.destroy();
  }
}

export default defn(module, InboxDrawerView);
