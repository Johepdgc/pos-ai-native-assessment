import Vue from 'vue';
import Vuetify from 'vuetify';
import axios from 'axios';
import 'vuetify/dist/vuetify.min.css';
import '@mdi/font/css/materialdesignicons.min.css';
import './style.css';

Vue.use(Vuetify);

new Vue({
  el: '#app',
  vuetify: new Vuetify({ theme: { themes: { light: { primary: '#17665e', secondary: '#e4a64c' } } } }),
  data: () => ({
    products: [], search: '', loading: false, saving: false, dialog: false, formValid: false,
    form: { name: '', barcode: '', price: '' }, notice: '', noticeType: 'success', searchTimer: null,
    cart: [], nextLineKey: 1, savingSale: false
  }),
  computed: {
    cartValid() { return this.cart.every(this.validLine); },
    totalCents() { return this.cart.reduce((sum, line) => sum + (this.validLine(line) ? this.lineTotalCents(line) : 0), 0); }
  },
  created() { this.loadProducts(); },
  methods: {
    money(value) { return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(value)); },
    validPrice(value) { return /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(String(value ?? '').trim()) && Number(value) > 0; },
    validLine(line) { return this.validPrice(line.unitPrice) && Number.isInteger(Number(line.quantity)) && line.quantity >= 1 && line.quantity <= 999; },
    lineTotalCents(line) { return Math.round(Number(line.unitPrice) * 100) * Number(line.quantity); },
    addToSale(product) { this.cart.push({ key: this.nextLineKey++, productId: product.id, name: product.name, unitPrice: String(product.price), quantity: 1 }); this.notice = ''; },
    removeFromSale(key) { this.cart = this.cart.filter(line => line.key !== key); },
    showError(error) { this.noticeType = 'error'; this.notice = error.response?.data?.message || 'No se pudo completar la operación. Inténtalo de nuevo.'; },
    scheduleSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => this.loadProducts(), 250); },
    async loadProducts() {
      this.loading = true;
      try { this.products = (await axios.get('/api/products', { params: { search: this.search || '' } })).data; }
      catch (error) { this.showError(error); }
      finally { this.loading = false; }
    },
    closeDialog() { this.dialog = false; this.form = { name: '', barcode: '', price: '' }; this.$refs.form?.resetValidation(); },
    async saveProduct() {
      if (!this.$refs.form.validate() || this.saving) return;
      this.saving = true;
      try {
        await axios.post('/api/products', this.form);
        this.closeDialog(); this.noticeType = 'success'; this.notice = 'Producto creado correctamente.';
        await this.loadProducts();
      } catch (error) { this.showError(error); }
      finally { this.saving = false; }
    },
    async saveSale() {
      if (!this.cart.length || !this.cartValid || this.savingSale) return;
      this.savingSale = true;
      try {
        const items = this.cart.map(line => ({ productId: line.productId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice).toFixed(2) }));
        const { data } = await axios.post('/api/sales', { items });
        this.cart = []; this.noticeType = 'success'; this.notice = `Venta #${data.id} guardada por ${this.money(data.total)}.`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) { this.showError(error); }
      finally { this.savingSale = false; }
    }
  }
});
