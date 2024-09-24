import idGenerator from "../utils/idGenerator";
import Peer from "./Peer";

class Category {
  constructor(categorys, name, id = null) {
    this.id = id || idGenerator(categorys);
    this.name = name;
    this.persons = []; // objetos del tipo Person + atributo 'gasto'
  }

  getPersons(){
    return [...this.persons];
  }

  addPerson(person, gasto) {
    this.persons.push({ ...person, gasto });
    return this;
  }

  total() {
    let sum = 0;
    this.persons.forEach((e) => {
      sum += e.gasto;
    });

    return sum;
  }

  average() {
    if (!this.persons || this.persons.length === 0) return 0;
    let sum = 0;
    this.persons.forEach((e) => {
      sum += e.gasto;
    });

    return sum / this.persons.length;
  }

  distribute() {
    const avg = this.average();

    let result = [];

    const personsCopy = this.getPersons().map(person => ({ ...person }));

    personsCopy.forEach((p) => {
      const pCopy = p;
      let i = 0;

      while (i < personsCopy.length && pCopy.gasto > avg) {
        const p2Copy = personsCopy[i];

        if (p2Copy.id !== pCopy.id) {

          if (p2Copy.gasto < avg) {
            let amount = 0;
            const dist1 = pCopy.gasto - avg;
            const dist2 = avg - p2Copy.gasto;

            if (dist1 > dist2) {
              amount = dist2;
              p2Copy.gasto += amount;
              pCopy.gasto -= amount;
            } else if (dist1 < dist2) {
              amount = dist1;
              p2Copy.gasto += amount;
              pCopy.gasto -= amount;
            } else {
              amount = dist1;
              p2Copy.gasto += amount;
              pCopy.gasto -= amount;
            }
            result.push(new Peer(pCopy, p2Copy, amount));
          }
        }

        i++;
      }
    });
    return result;
  }
}

export default Category;
