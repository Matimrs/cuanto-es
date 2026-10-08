import idGenerator from '../utils/idGenerator.js';

class Person {
    constructor(nombre, persons) {
      this.name = nombre;
      this.id = idGenerator(persons);
    }
  }

export default Person;