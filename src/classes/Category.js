import idGenerator from "../utils/idGenerator";
import Peer from "./Peer";

class Category {
  constructor(categorys, name) {
    this.id = idGenerator(categorys);
    this.name = name;
    this.persons = []; // objetos del tipo Person + atributo 'gasto'
  }

  addPerson(person, gasto) {
    this.persons.push({ ...person, gasto });
    return this;
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

    this.persons.forEach((p) => {
      let i = 0;

      while (i < this.persons.length && p.gasto > avg) {
        const p2 = this.persons[i];

        if (p2 !== p) {
          if (p2.gasto < avg) {
            let amount = 0;
            const dist1 = p.gasto - avg;
            const dist2 = avg - p2.gasto;
            if (dist1 > dist2) {
              amount = dist2;
              p2.gasto += amount;
              p.gasto -= amount;
            } else if (dist1 < dist2) {
              amount = dist1;
              p2.gasto += amount;
              p.gasto -= amount;
            } else {
              amount = dist1;
              p2.gasto += amount;
              p.gasto -= amount;
            }
            result.push(new Peer(p, p2, amount));
          }
        }

        i++;
      }
    });
    return result;
  }
}

export default Category;
