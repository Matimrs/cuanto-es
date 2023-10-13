const Result = ({debtor,amount,creditor}) => {
    return(
        <div>
            <p><b>{debtor}</b> le paga <b>${amount}</b> a <b>{creditor}</b></p>
        </div>
    )
}

export default Result;