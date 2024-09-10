import Peer from "../classes/Peer";

//persons y categorys son arreglos

export const calculate = (categorys) => {
    //temp es un arreglo de objetos del tipo Peer
    let temp = [];

    categorys.forEach((c) => {
      temp.concat(c.distribute());
    });

    //UNIFICAR PAGOS:

    //result es un arreglo de objetos del tipo Peer
    let result = [];

    temp.forEach((p) => {

      let creditor = p.creditor;
      let debtor = p.debtor;
      let amount = p.amount;

      temp.forEach((p2) => {
        if(p !== p2){
          if(p.creditor === p2.creditor && p.debtor === p2.debtor){
            amount += p2.amount;
          }
          else if(p.creditor === p2.debtor && p.debtor === p2.creditor){
            amount -= p2.amount;
          }
        }
      });

      switch(amount){
        case amount > 0:
          result.push(new Peer(creditor, debtor, amount));
          break;
        case amount < 0:
          result.push(new Peer(debtor, creditor, -amount));
          break;
        default: break;
      }

    });
    return result;
  };



  export default calculate;