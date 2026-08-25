import { writeFile, readFile, access } from "node:fs/promises"
import path from "node:path";
import os from "node:os";

const args = process.argv.slice(2)
const EXPENSES_PATH = new URL("./expenses.json", import.meta.url)
const USER_DATA_PATH = new URL("./user-data.json", import.meta.url)

async function getParsedFile(fileURL) {
    try {
        let fileContent = await readFile(fileURL, { encoding: "utf-8" })

        let parsedFile = JSON.parse(fileContent)
        
        return parsedFile
    } catch (e) {
        console.log("Error while parsing file.")

        return
    }
}

function validateDate(input) {
    const fecha = new Date(input)

    // verify date is valid
    if (isNaN(fecha.getTime())) {
        return false
    }

    return true
}

function clearCmd() {
    // Clear the terminal screen in Node.js
    process.stdout.write("\x1Bc")
}

async function validateDatabases() {
    // validate if expenses database exists
    try {
        await access(EXPENSES_PATH)
    } catch (e) {
        await writeFile(EXPENSES_PATH, JSON.stringify([]))
        console.log("Database not found, new database created.")
    }
    // validate if user database exists
    try {
        await access(USER_DATA_PATH)
    } catch (e) {
        await writeFile(USER_DATA_PATH, JSON.stringify([{budget: 0, totalExpenses: 0}]))
        console.log("Database not found, new database created.")
    }
}

await validateDatabases()

async function addExpense() {
    // remove previous commands
    clearCmd()

    // add validation when total-expenses is close to budged
    let usage = 'Usage: expense-tracker add --description string --amount number {--date YYYY/MM/DD --category string} <- optional.'

    // add statement has to have between 1 to 9 arguments 
    if (args.length === 1 || args.length > 9) {
        console.log(usage)
        process.exit(1)
    }

    // check if obligatory params are provided (desc, amount and its flags)
    if (args.at(1) !== "--description" || args.at(2).startsWith("--") || args.at(3) !== "--amount" || args.at(4).startsWith("--")) {
        console.log(usage)
        process.exit(1)
    }

    if (args.at(2).length <= 0 || args.at(2).length >= 50) {
        console.log("Description should've 1 to 50 caracters")
        process.exit(1)
    }

    let description = args.at(2)
    let amount = 0

    try {
        amount = Number.parseFloat(args.at(4))
    } catch (error) {
        console.log("Enter a valid number.")
        process.exit(1)
    }

    // validate date using 
    let actualDate = new Date()
    let parsedDate = `${actualDate.getFullYear()}/${actualDate.getMonth() + 1}/${actualDate.getDate()}`
    let date = parsedDate
    
    if (args.at(5)) {
        if (!args.at(6)) {
            console.log(usage)
            process.exit(1)
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(args.at(6))) {
            console.log(`The format should be YYYY-MM-DD, your input is: ${args.at(6)}.`)
            process.exit(1)
        }

        if (!validateDate(args.at(6))) {
            console.log("Invalid Date, the format should be YYYY-MM-DD.")
            process.exit(1)
        }

        date = args.at(6)
    }
    
    if (Number.isNaN(amount) || amount < 0) {
        console.log("Amount should be a positive number.")
        process.exit(1)
    }

    let categoryExists = args.findIndex(elem => elem === "--category")
    let category = categoryExists !== -1 ? args.at(categoryExists + 1) : ""

    if (categoryExists !== -1 && (!args.at(categoryExists + 1) || args.at(categoryExists + 1).length <= 0)) {
        console.log(usage)
        process.exit(1)
    }
    
    let parsedUserInfo = await getParsedFile(USER_DATA_PATH)

    if (!parsedUserInfo) {
        process.exit(1)
    }

    parsedUserInfo[0].totalExpenses += amount 

    let totalExpenses = parsedUserInfo[0].totalExpenses
    let budget = parsedUserInfo[0].budget

    const userDataString = JSON.stringify(parsedUserInfo)

    await writeFile(USER_DATA_PATH, userDataString)

    if (budget){
        if (budget < totalExpenses) {
            console.log(`The total expenses have surpassed the monthly budget: $${totalExpenses} of $${budget}.`);
        } else if (budget * 0.90 < totalExpenses) {
            console.log(`The total expenses are about to surpass the monthly budget: $${totalExpenses} of $${budget}.`);
        } 
    }
    
    let parsedFile = await getParsedFile(EXPENSES_PATH)

    if (!parsedFile) {
        process.exit(1)
    }

    let newID = parsedFile.length + 1 ?? 1

    let expense = {
        id: newID,
        description,
        amount,
        date,
        category,
    }

    parsedFile.push(expense)

    const fileString = JSON.stringify(parsedFile)
    await writeFile(EXPENSES_PATH, fileString)

    console.log("Expense registered!")
}

async function listExpenses() {
    // remove previous commands
    clearCmd()

    // check if category is provided
    let categoryExists = args.findIndex(elem => elem === "--category")
    let category = categoryExists !== -1 ? args.at(categoryExists + 1) : ""

    if (categoryExists !== -1 && (!args.at(categoryExists + 1) || args.at(categoryExists + 1).length <= 0)) {
        console.log("Missing params, usage: list {--category string}")
        process.exit(1)
    }

    let parsedFile = await getParsedFile(EXPENSES_PATH)

    if (!parsedFile) {
        process.exit(1)
    }

    if (category) {
        let mappedExpenses = parsedFile.filter(elem => elem.category === category)
        
        if (mappedExpenses.length === 0) console.log("No expenses found with category provided")
        else console.table(mappedExpenses)
    }
    else {
        console.table(parsedFile)
    }
}

async function clearDataBases() {
    // remove previous commands
    clearCmd()

    // we clear both expenses and user databases
    await writeFile(EXPENSES_PATH, "[]")

    let parsedUserInfo = await getParsedFile(USER_DATA_PATH)

    if (!parsedUserInfo) {
        process.exit(1)
    }

    parsedUserInfo[0].totalExpenses = 0

    parsedUserInfo[0].budget = 0
    
    const userDataString = JSON.stringify(parsedUserInfo)

    await writeFile(USER_DATA_PATH, userDataString)

    console.log("Las bases de datos an sido restauradas.")
}

async function getSummary() {
    // remove previous commands
    clearCmd()

    let parsedUserInfo = await getParsedFile(USER_DATA_PATH)

    if (!parsedUserInfo) {
        process.exit(1)
    }

    console.log(`Total de dinero gastado: $${parsedUserInfo[0].totalExpenses} ARS.`)
}

async function setBudget() {
    // remove previous commands
    clearCmd()
    
    if (args.length === 2 && !Number.isNaN(Number(args.at(1)))) {
        let budget = Number(args.at(1))

        let parsedUserInfo = await getParsedFile(USER_DATA_PATH)

        if (!parsedUserInfo) {
            process.exit(1)
        }
        
        parsedUserInfo[0].budget = budget
    
        const userDataString = JSON.stringify(parsedUserInfo)

        await writeFile(USER_DATA_PATH, userDataString)

        console.log(`Budget set to $${budget} succesfully.`);
        
    } else {
        console.log("Enter a positive valid number as a budget.")
    }
}

async function deleteExpense () {
    // remove previous commands
    clearCmd()

    // delete id
    if (args.length === 1 || args.length > 3){
        console.log("Usage: delete --id number");
        process.exit(1)
    }

    let id = Number(args.at(2))

    if (args.at(1) !== "--id" ){
        console.log("Usage: delete --id number");
        process.exit(1)
    }

    if (isNaN(id) || id < 0) {
        console.log("Id must ve a valid number")
        process.exit(1)
    }

    let found = false

    let parsedFile = await getParsedFile(EXPENSES_PATH)

    if (!parsedFile) {
        process.exit(1)
    }
    
    let newTotal = 0

    parsedFile = parsedFile.filter(expense => {
        if (expense.id !== id) {
            newTotal += expense.amount
            return expense
        }
        found = true
        return
    })
    
    const fileString = JSON.stringify(parsedFile)
    await writeFile(EXPENSES_PATH, fileString)
    
    if (!found) console.log("Expense not found.")
    else {
        let parsedUserInfo = await getParsedFile(USER_DATA_PATH)

        if (!parsedUserInfo) {
            process.exit(1)
        }
        
        parsedUserInfo[0].totalExpenses = newTotal
    
        const userDataString = JSON.stringify(parsedUserInfo)

        await writeFile(USER_DATA_PATH, userDataString)

        console.log("Expense deleted succesfully")
    }
}

async function updateExpense() { 
    // remove previous commands
    clearCmd()
    
    // check if 1st param == --id and 2nd is number
    let id = Number(args.at(2))

    if (args.at(1) !== "--id" || (isNaN(id) || id < 1)) {
        console.log("Usage: update --id number {values to update: --description string --amount number --date YYYY/MM/DD string}.")
        process.exit(1)
    }

    // check if params > 2 or > 10
    if (args.length <= 2 || args.length > 10) {
        console.log("Usage: update --id number {values to update: --description string --amount number --date YYYY/MM/DD string --category string}.")
        process.exit(1)
    }

    // check if expense with id exists
    let parsedFile = await getParsedFile(EXPENSES_PATH)

    if (!parsedFile) {
        process.exit(1)
    }

    let expense = parsedFile.find(elem => elem.id === id)
    if (!expense) {
        console.log("Expense with id Provided couldn't be found.")
        process.exit(1)
    }
    
    let expenseAmount = expense.amount  
    let newAmount;

    let flags = ["description", "amount", "date", "category"]
    
    for (let flag of flags) {
        
        let flagExists = args.findIndex(elem => elem == `--${flag}`)

        if (flagExists !== -1) {
            if (flag === "amount") {
                let amount = Number(args.at(flagExists + 1))

                if (!amount || isNaN(amount)) {
                    console.log("Amount should be a valid positive number.")
                    process.exit(1)
                }
                // for user data update
                newAmount = amount

                expense[flag] = amount
            }
            else if (flag == "date") { 
                let date = args.at(flagExists + 1)

                if (!date || !validateDate(date)) {
                    console.log("Date has an incorrect format, should be YYYY/MM/DD.")
                    process.exit(1)
                }

                expense[flag] = date
                //
            }
            else {
                let cont = args.at(flagExists + 1)

                if (!cont || cont.length <= 0 || cont.length >= 100) {
                    console.log(`${flag} content should've 1 to 99 caracters.`)
                    process.exit(1)
                }

                expense[flag] = cont
            }  
        }
    }
    // insert updated expense in database
    let index = parsedFile.findIndex(elem => elem.id === id)

    parsedFile[index] = expense
    const fileString = JSON.stringify(parsedFile)
    await writeFile(EXPENSES_PATH, fileString)

    if (newAmount) {
        let parsedUserInfo = await getParsedFile(USER_DATA_PATH)
    
        if (!parsedUserInfo) {
            process.exit(1)
        }
    
        parsedUserInfo[0].totalExpenses -= expenseAmount
        parsedUserInfo[0].totalExpenses += newAmount
    
        const userDataString = JSON.stringify(parsedUserInfo)
    
        await writeFile(USER_DATA_PATH, userDataString)
    }

    console.log(`Expense with id ${id} has been updated.`)
}

function convertToCSV(arr) {
  const array = [Object.keys(arr[0])].concat(arr)

  return array.map(it => {
    return Object.values(it).toString()
  }).join('\n')
}

async function exportCVS() {
    // remove previous commands
    clearCmd()

    let parsedFile = await getParsedFile(EXPENSES_PATH)

    if (!parsedFile) {
        process.exit(1)
    }

    if (parsedFile.length === 0) {
        console.log("No expenses found, export cancelled.");
        process.exit(1)
    }

    let cvsContent = convertToCSV(parsedFile)

    let csvFile = "data:text/csv;charset=utf-8," 
    + cvsContent;

    const downloadsPath = path.join(os.homedir(), "Downloads");
    const filePath = path.join(downloadsPath, "expenses.csv");

    await writeFile(filePath, csvFile)

    console.log("Expenses exported, check Downloads folder.")
}

switch (args.at(0)) {
    case "add":
        await addExpense()
        break;
    case "list":
        await listExpenses()
        break;
    case "clear":
        await clearDataBases()
        break;
    case "summary":
        await getSummary()
        break;
    case "set-budget":
        await setBudget()
        break;
    case "delete":
        await deleteExpense()
        break;
    case "update":
        await updateExpense()
        break;
    case "export-cvs":
        await exportCVS()
        break;
    default:
        console.log("Argument provided is not a function: use [add, list, clear, summary, set-budget, delete, update, export].")
}