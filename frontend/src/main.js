import Vue from 'vue';
import Vuetify from 'vuetify';
import axios from 'axios';
import 'vuetify/dist/vuetify.min.css';
import './style.css';

Vue.use(Vuetify);

new Vue({
  el: '#app',
  vuetify: new Vuetify({ theme: { themes: { light: { primary: '#17665e', secondary: '#e4a64c' } } } }),
  data: () => ({
    products: [], search: new URLSearchParams(window.location.search).get('search') || '', loading: false, saving: false, dialog: false, formValid: false,
    form: { name: '', barcode: '', price: '' }, formError: '', barcodeError: '', notice: '', noticeType: 'success', searchTimer: null,
    cart: [], nextLineKey: 1, savingSale: false, searchRequest: 0, removedLines: [], undoTimer: null
  }),
  computed: {
    cartValid() { return this.cart.every(this.validLine); },
    totalCents() { return this.cart.reduce((sum, line) => sum + (this.validLine(line) ? this.lineTotalCents(line) : 0), 0); }
  },
  created() { this.loadProducts(); },
  mounted() { window.addEventListener('beforeunload', this.warnUnsavedSale); },
  beforeDestroy() { window.removeEventListener('beforeunload', this.warnUnsavedSale); clearTimeout(this.searchTimer); clearTimeout(this.undoTimer); },
  methods: {
    money(value) { return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(value)); },
    validPrice(value) { return /^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(String(value ?? '').trim()) && Number(value) > 0; },
    validQuantity(value) { return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 999; },
    validLine(line) { return this.validPrice(line.unitPrice) && this.validQuantity(line.quantity); },
    lineTotalCents(line) { return Math.round(Number(line.unitPrice) * 100) * Number(line.quantity); },
    addToSale(product) { this.cart.push({ key: this.nextLineKey++, productId: product.id, name: product.name, unitPrice: String(product.price), quantity: 1 }); this.notice = ''; },
    removeFromSale(key) {
      const index = this.cart.findIndex(line => line.key === key);
      if (index < 0) return;
      const [line] = this.cart.splice(index, 1);
      clearTimeout(this.undoTimer);
      this.removedLines.push({ line, index });
      this.undoTimer = setTimeout(() => { this.removedLines = []; }, 8000);
    },
    undoRemoval() {
      if (!this.removedLines.length) return;
      const { line, index } = this.removedLines.pop();
      this.cart.splice(Math.min(index, this.cart.length), 0, line);
      clearTimeout(this.undoTimer);
      if (this.removedLines.length) this.undoTimer = setTimeout(() => { this.removedLines = []; }, 8000);
    },
    warnUnsavedSale(event) {
      if (!this.cart.length) return;
      event.preventDefault();
      event.returnValue = '';
    },
    showError(error) { this.noticeType = 'error'; this.notice = error.response?.data?.message || 'No se pudo completar la operación. Inténtalo de nuevo.'; },
    scheduleSearch() {
      clearTimeout(this.searchTimer);
      const url = new URL(window.location.href);
      if (this.search.trim()) url.searchParams.set('search', this.search.trim());
      else url.searchParams.delete('search');
      window.history.replaceState(null, '', url);
      this.searchTimer = setTimeout(() => this.loadProducts(), 250);
    },
    async loadProducts() {
      const request = ++this.searchRequest;
      this.loading = true;
      try {
        const { data } = await axios.get('/api/products', { params: { search: this.search || '' } });
        if (request === this.searchRequest) this.products = data;
      } catch (error) { if (request === this.searchRequest) this.showError(error); }
      finally { if (request === this.searchRequest) this.loading = false; }
    },
    closeDialog() { this.dialog = false; this.form = { name: '', barcode: '', price: '' }; this.formError = ''; this.barcodeError = ''; this.$refs.form?.resetValidation(); },
    async saveProduct() {
      if (this.saving) return;
      this.formError = ''; this.barcodeError = '';
      if (!this.$refs.form.validate()) {
        this.$nextTick(() => this.$refs.form.$el.querySelector('.v-input--has-state input')?.focus());
        return;
      }
      this.saving = true;
      try {
        await axios.post('/api/products', this.form);
        this.closeDialog(); this.noticeType = 'success'; this.notice = 'Producto creado correctamente.';
        await this.loadProducts();
      } catch (error) {
        if (error.response?.status === 409) {
          this.barcodeError = error.response.data.message;
          this.$nextTick(() => this.$refs.form.$el.querySelector('[name="product-barcode"]')?.focus());
        } else this.formError = error.response?.data?.message || 'No se pudo guardar el producto. Inténtalo de nuevo.';
      } finally { this.saving = false; }
    },
    async saveSale() {
      if (!this.cart.length || !this.cartValid || this.savingSale) return;
      this.savingSale = true;
      try {
        const items = this.cart.map(line => ({ productId: line.productId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice).toFixed(2) }));
        const { data } = await axios.post('/api/sales', { items });
        this.cart = []; this.removedLines = []; clearTimeout(this.undoTimer); this.noticeType = 'success'; this.notice = `Venta #${data.id} guardada por ${this.money(data.total)}.`;
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } catch (error) { this.showError(error); }
      finally { this.savingSale = false; }
    }
  }
});
