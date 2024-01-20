const Result = ({debtor,amount,creditor}) => {
    return(
        <article class="message is-dark container my-5" style={{width: '100%'}}>
            <div class="message-body">
                <b>{debtor}</b> pays <b>${amount}</b> to <b>{creditor}</b>
            </div>
        </article>
    )
}

export default Result;