import { prepareTransition } from 'util.misc'
import { disableBodyScroll, clearAllBodyScrollLocks } from 'vendor.body-scroll-lock'
import { trapFocus, removeTrapFocus, focusable } from 'util.a11y'
import { EVENTS } from 'util.events'

class HeaderDrawer extends HTMLElement {
  constructor() {
    super()
    this.isOpen = false
    this.abortController = new AbortController()
  }
  connectedCallback() {
    if (!this.getAttribute('open') || !this.getAttribute('close')) return
    document.addEventListener(this.getAttribute('open'), this.open.bind(this), { signal: this.abortController.signal })
    document.addEventListener(this.getAttribute('close'), this.close.bind(this), {
      signal: this.abortController.signal
    })
  }

  open(evt) {
    this.activeElement = evt.target

    this.dispatchEvent(new CustomEvent(EVENTS.sizeDrawer, { bubbles: true }))

    prepareTransition(
      this,
      function () {
        this.classList.add('is-active')
      }.bind(this)
    )

    const _scrollX = window.scrollX
    const _scrollY = window.scrollY
    const _prevScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    disableBodyScroll(this, {
      reserveScrollBarGap: true,
      // Explicitly allow touch events within drawer for iOS scroll support
      allowTouchMove: (el) => this === el || this.contains(el),
    });


    // Trap focus within the drawer
    trapFocus(this)

    // Enforce focus wrapping on Tab/Shift+Tab inside the drawer
    this.addEventListener('keydown', this.handleKeydown, { signal: this.abortController.signal })

    const siteHeader = document.querySelector('#SiteHeader')
    const isSticky = siteHeader?.dataset.sticky === 'true'

    requestAnimationFrame(() => {
      if (!isSticky) {
        window.scrollTo(0, 0)
      } else {
        window.scrollTo(_scrollX, _scrollY)
      }

      document.documentElement.style.scrollBehavior = _prevScrollBehavior || ''
    })

    // Esc key closes the drawer
    window.addEventListener('keyup', this.handleWindowKeyup, { signal: this.abortController.signal })

    this.dispatchEvent(new CustomEvent(EVENTS.headerOverlayRemoveClass, { bubbles: true }))
    this.dispatchEvent(new CustomEvent(EVENTS.headerDrawerOpened, { bubbles: true }))
    this.dispatchEvent(new CustomEvent('drawerOpen', { bubbles: true }))

    this.isOpen = true

    // Clicking out of the drawer closes it
    setTimeout(() => {
      window.addEventListener('click', this.handleWindowClick, { signal: this.abortController.signal })
    }, 0)
  }

  close(evt, noAnimate) {
    // Do not close if click event came from inside drawer
    if (evt && evt.target.closest && evt.target.closest('.site-header__drawer')) {
      return
    }

    if (!this.isOpen) {
      return
    }

    if (noAnimate) {
      this.classList.remove('is-active')

      this.dispatchEvent(new CustomEvent(EVENTS.headerDrawerClosed, { bubbles: true }))

      window.removeEventListener('keyup', this.handleWindowKeyup)
      window.removeEventListener('click', this.handleWindowClick)
      this.removeEventListener('keydown', this.handleKeydown)

      this.isOpen = false

      // Remove focus trap
      if (this.activeElement) removeTrapFocus(this.activeElement)

      clearAllBodyScrollLocks()
    } else {
      const onClosed = () => {
        this.removeEventListener('transitionend', onClosed)

        this.dispatchEvent(new CustomEvent(EVENTS.headerDrawerClosed, { bubbles: true }))

        window.removeEventListener('keyup', this.handleWindowKeyup)
        window.removeEventListener('click', this.handleWindowClick)
        this.removeEventListener('keydown', this.handleKeydown)

        this.isOpen = false

        // Remove focus trap
        if (this.activeElement) removeTrapFocus(this.activeElement)

        clearAllBodyScrollLocks()
      }

      this.addEventListener('transitionend', onClosed, { once: true })

      prepareTransition(
        this,
        function () {
          this.classList.remove('is-active')
        }.bind(this)
      )
    }
  }

  handleWindowKeyup = (evt) => {
    if (evt.keyCode === 27) {
      this.close()
    }
  }

  handleWindowClick = (evt) => {
    this.close(evt)
  }

  handleKeydown = (evt) => {
    const isTab = evt.key === 'Tab' || evt.keyCode === 9
    if (!isTab) return

    let elements = []
    try {
      elements = focusable(this) || []
    } catch (e) {
      elements = []
    }
    if (!elements.length) return

    const first = elements[0]
    const last = elements[elements.length - 1]
    const active = document.activeElement

    if (!evt.shiftKey && active === last) {
      evt.preventDefault()
      first && first.focus()
      return
    }

    if (evt.shiftKey && (active === first || active === this)) {
      evt.preventDefault()
      last && last.focus()
      return
    }
  }

  disconnectedCallback() {
    this.abortController.abort()
  }
}

customElements.define('header-drawer', HeaderDrawer)
