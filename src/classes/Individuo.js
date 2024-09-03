import idGenerator from '../utils/idGenerator.js';

class Individuo {
    constructor(nombre, gasto, array) {
      this.name = nombre;
      this.gasto = parseFloat(gasto);
      this.recibe = false;
      this.lepaga = [];
      this.id = idGenerator(array);
    }
  }

export default Individuo;