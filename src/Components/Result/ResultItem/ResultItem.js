export const ResultItem = ({debtor,amount,creditor}) => {
    return(
        <article className="message is-black container my-5" style={{width: '100%'}}>
            <div className="message-body">
                <b>{debtor}</b> pays <b>${amount}</b> to <b>{creditor}</b>
            </div>
        </article>
    )
}
