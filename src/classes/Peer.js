class Peer {
    //debtor y deudor objetos del tipo Person + atributo 'gasto'
  constructor(creditor,debtor, amount) {
    this.creditor = creditor;  
    this.debtor = debtor;
    this.amount = amount;
  }
}

export default Peer;