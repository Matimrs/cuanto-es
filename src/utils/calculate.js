import Peer from "../classes/Peer";

//persons y categorys son arreglos

export const calculate = (categorys) => {
  //temp es un arreglo de objetos del tipo Peer
  let temp = [];

  console.log(categorys);

  categorys.forEach((c) => {
  
    temp = temp.concat(c.distribute());
  });

  //UNIFICAR PAGOS:

  //result es un arreglo de objetos del tipo Peer
  let result = [];

  let toRemove = [];

  temp.forEach((p) => {
    if (!toRemove.includes(p.id)) {
      let creditor = p.creditor;
      let debtor = p.debtor;
      let amount = p.amount;

      temp.forEach((p2) => {
        if (p.id !== p2.id && !toRemove.includes(p2.id)) {
          if (
            p.creditor.id === p2.creditor.id &&
            p.debtor.id === p2.debtor.id
          ) {
            amount += p2.amount;
            toRemove.push(p2.id);
          } else if (
            p.creditor.id === p2.debtor.id &&
            p.debtor.id === p2.creditor.id
          ) {
            amount -= p2.amount;
            toRemove.push(p2.id);
          }
        }
      });

      if (amount > 0) {
        result.push(new Peer(creditor, debtor, amount));
      } else if (amount < 0) {
        result.push(new Peer(debtor, creditor, -amount));
      }
    }
  });
  return result;
};

export default calculate;
