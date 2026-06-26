import { EVENTS } from 'util.events'

class VariantSku extends HTMLElement {
  connectedCallback() {
    this.abortController = new AbortController()

    document.addEventListener(
      `${EVENTS.variantChange}:${this.dataset.sectionId}:${this.dataset.productId}`,
      this.handleVariantChange.bind(this),
      { signal: this.abortController.signal }
    )
  }

  disconnectedCallback() {
    this.abortController.abort()
  }

  handleVariantChange({ detail }) {
    const { html, sectionId, variant } = detail

    if (!variant) {
      this.innerHTML = ''
      return
    }

    const skuSource = html.querySelector(`variant-sku[data-section-id="${sectionId}"]`)

    if (skuSource) {
      this.innerHTML = skuSource.innerHTML
    }
  }
}

customElements.define('variant-sku', VariantSku)
