import { v4 } from "uuid";
class Peer {
    //debtor y deudor objetos del tipo Person + atributo 'gasto'
  constructor(creditor,debtor, amount) {
    this.id = v4();
    this.creditor = creditor;  
    this.debtor = debtor;
    this.amount = amount;
  }
  decrement(amount) {
    this.amount -= amount;
  }
  increment(amount) {
    this.amount += amount;
  }
}

export default Peer;