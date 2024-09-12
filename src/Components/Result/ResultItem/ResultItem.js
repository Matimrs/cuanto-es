export const ResultItem = ({peer}) => {

    return(
        <article className="message is-black container my-5" style={{width: '100%'}}>
            <div className="message-body">
                <b>{peer.debtor.name} ({peer.debtor.id})</b> paga <b>${peer.amount}</b> a <b>{peer.creditor.name} ({peer.creditor.id})</b>
            </div>
        </article>
    )
}
