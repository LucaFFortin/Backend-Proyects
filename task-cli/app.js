#!/usr/bin/env node
import { writeFile, readFile, access } from "node:fs/promises"

const args = process.argv.slice(2)
const PATH = new URL("./tasks.json", import.meta.url)

async function getParsedFile(fileURL) {
    let fileContent
    try {
        fileContent = await readFile(fileURL, { encoding: "utf-8" })
    } catch (e) {
        console.log("Error on file reading")
        return
    }

    let parsedFile = JSON.parse(fileContent)

    return parsedFile
}

// validate if database exists
try {
    await access(PATH)
} catch (e) {
    await writeFile(PATH, "[{}]")
    console.log("Database not found, new database created")
    process.exit(1)
}

// cli methods
if (args.at(0) === "list") {
    const filterToken = args.at(1)

    if (!filterToken) {
        let parsedFile = await getParsedFile(PATH)
        console.log(parsedFile)
    } else if (!["done", "in-progress", "todo"].includes(filterToken)) {
        console.log(`${filterToken} is not a valid filter value.`)
    } else {
        let parsedFile = await getParsedFile(PATH)

        let wordToFilter = filterToken === "in-progress" ? "in progress"
            : filterToken === "todo" ? "todo"
            : filterToken === "done" ? "done" 
            : ""

        let filteredFile = parsedFile.filter(elem => elem.status === wordToFilter)

        if (filteredFile instanceof Array && filteredFile.length === 0) {
            console.log(`Tasks not found with ${wordToFilter} status`)
        } else {
            console.log(filteredFile)
        }
    }
}

if (args.at(0) === "add") {
    const taskToAdd = args.at(1)
    if (taskToAdd.length === 0 || taskToAdd.length > 100) {
        console.log("Task must have a length between 1 and 100 characters")
    } else {
        let parsedFile = await getParsedFile(PATH)
        const newID = parsedFile.at(-1).id + 1

        const formmatedContent = {
            id: newID,
            content: taskToAdd,
            status: "todo",
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        parsedFile.push(formmatedContent)

        const fileString = JSON.stringify(parsedFile)

        writeFile(PATH, fileString)
        console.log("task created succesfully!")
    }
}

if (args.at(0) === "update") {
    const id = Number(args.at(1))
    const task = args.at(2)

    if (args.length === 1) {
        console.log("usage: task-cli update id newTask")
    } else if (args.length < 3) {
        console.log("mising params, usage: task-cli update id newTask")
    } else if (Number.isNaN(id)) {
        console.log("id must be a valid number")
    } else if (task.length < 1 && task.length > 100) {
        console.log("task must be a string with a length betweem 1 and 100 characters")
    } else {
        let parsedFile = await getParsedFile(PATH)
        let found = false
        parsedFile.filter(elem => {
            if (elem.id === id) {
                elem.content = task
                elem.updatedAt = new Date()
                found = true
                return elem
            }
            return elem
        })

        const fileString = JSON.stringify(parsedFile)

        writeFile(PATH, fileString)
        console.log("task updated succesfully!")
    }
}

if (args.at(0) === "delete") {
    const id = Number(args.at(1))

    if (args.length === 1) {
        console.log("usage: task-cli delete id")
    }
    else if (Number.isNaN(id)) {
        console.log("id must be a valid number")
    }
    else {
        let found = false
        let parsedFile = await getParsedFile(PATH)

        parsedFile = parsedFile.filter((elem) => {
            if (elem.id !== id) return elem
            found = true
        })

        if (!found) {
            console.log("task not found");
        } else {
            const fileString = JSON.stringify(parsedFile)

            writeFile(PATH, fileString)
            console.log("task deteled succesfully!")
        }
    }
}

if (args.at(0) === "mark-done") {
    const id = Number(args.at(1))

    if (args.length === 1) {
        console.log("usage: task-cli mark-done id ")
    } else if (Number.isNaN(id) || id < 0) {
        console.log("id must be a valid number")
    } else {
        let found = false
        let redundant = false
        let parsedFile = await getParsedFile(PATH)

        parsedFile = parsedFile.map(elem => {
            if (elem.id === id && elem.status !== "done") {
                elem.status = "done"
                found = true
                return elem
            } else if (elem.id === id && elem.status === "done"){
                redundant = true
                found = true
                return elem
            }
            return elem
        })

        // si ya esta en done no cambiar o mandar mensaje
        if (!found) {
            console.log("task not found");
        } else if (redundant) {
            console.log(`Task already with done status`)
        } else {
            const fileString = JSON.stringify(parsedFile)

            writeFile(PATH, fileString)
            console.log("task updated with done status succesfully!")
        }
    }
}

if (args.at(0) === "mark-in-progress") {
    const id = Number(args.at(1))

    if (args.length === 1) {
        console.log("usage: task-cli update id newTask")
    }
    else if (Number.isNaN(id) || id <= -1) {
        console.log("id must be a valid number")
    } else {
        let found = false
        let redundant = false
        let parsedFile = await getParsedFile(PATH)

        parsedFile.map(elem => {
            if (elem.id === id && elem.status !== "in progress") {
                elem.status = "in progress"
                found = true
                return elem
            } else if (elem.id === id && elem.status === "in progress"){
                redundant = true
                found = true
                return elem
            }
            return elem
        })

        if (!found) {
            console.log("Task not found");
        } else if (redundant) {
            console.log("Task already with in progress status")
        } else {
            const fileString = JSON.stringify(parsedFile)

            writeFile(PATH, fileString)
            console.log("Task updated with in progress status succesfully!")
        }
    }
}

if (args.at(0) === "mark-todo") {
    const id = Number(args.at(1))

    if (args.length === 1) {
        console.log("usage: task-cli update id newTask")
    }
    else if (Number.isNaN(id) || id < 0) {
        console.log("id must be a valid number")
    }
    else {
        let found = false
        let redundant = false
        let parsedFile = await getParsedFile(PATH)

        parsedFile.map(elem => {
            if (elem.id === id && elem.status !== "todo") {
                elem.status = "todo"
                found = true
                return elem
            } else if (elem.id === id && elem.status === "todo"){
                redundant = true
                found = true
                return elem
            }
            return elem
        })

        if (!found) {
            console.log("task not found");
        } else if (redundant) {
            console.log("Task already with todo status")
        } else {
            const fileString = JSON.stringify(parsedFile)

            writeFile(PATH, fileString)
            console.log("task updated to todo succesfully!")
        }
    }
}