export const ResultItem = ({peer}) => {

    return(
        <article className="message is-black container my-5" style={{width: '100%'}}>
            <div className="message-body" style={{display: 'flex', flexDirection:'column', justifyContent:'center', alignItems: "center"}}>
                <div><p>{peer.debtor.name} ({peer.debtor.id})</p></div>
                <div><p>---<b>${peer.amount.toFixed(2)}</b>{"-->"}</p> </div>
                <div><p>{peer.creditor.name} ({peer.creditor.id})</p></div>
                 
            </div>
        </article>
    )
}
