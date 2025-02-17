import { log, time } from "console";
import express, { Request, Response } from "express";
import fs from "fs";
import { receiveMessageOnPort } from "worker_threads";
// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
    name: string;
    type: string;
}

interface requiredItem {
    name: string;
    quantity: number;
}

interface recipe extends cookbookEntry {
    requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
    cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: any = null;

// Task 1 helper (don't touch)
app.post("/parse", (req: Request, res: Response) => {
    const { input } = req.body;

    const parsed_string = parse_handwriting(input);
    if (parsed_string == null) {
        res.status(400).send("this string is cooked");
        return;
    }
    res.json({ msg: parsed_string });
    return;
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that
const parse_handwriting = (recipeName: string): string | null => {
    //Replce all underscores and dashes with spaces and more than one space with a space
    const string = recipeName
        .replace(/[_-]/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/[^a-zA-Z ]/g, "")
        .trim();
    if (string.length === 0) {
        return null;
    }
    string[0].toUpperCase();
    return string
        .split(" ")
        .map((word) => {
            const newWord = word.toLowerCase();
            return (
                String(newWord).charAt(0).toUpperCase() +
                String(newWord).slice(1)
            );
        })
        .join(" ");
};

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
    fs.readFile("./Cookbook.json", (err, data) => {
        if (err) {
            return res.status(400).send("");
        }
        const cookBook = JSON.parse(data.toString());
        if (req.body.type !== "recipe" && req.body.type !== "ingredient") {
            return res.status(400).send("");
        }
        if (
            req.body.type === "ingredient" &&
            (!req.body.cookTime || req.body.cookTime < 0)
        ) {
            return res.status(400).send("");
        }
        
        if (req.body.type === "recipe" && req.body.requiredItems) {
            for (const item of req.body.requiredItems) {
                if (typeof item.name !== "string") {
                    return res.status(400).send("");
                }
            }
        }

        for (const entry of cookBook) {
            if (entry.name === req.body.name) {
                return res.status(400).send("");
            }
        }

        fs.writeFile(
            "./Cookbook.json",
            JSON.stringify([...cookBook, req.body]),
            (err) => {
                if (err) {
                    return res.status(400).send("");
                }
                return res.status(200).send("");
            }
        );
    });
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Request) => {
    const recipeName = req.query.name;
    if (!recipeName) {
        return res.status(400).send("");
    }

    fs.readFile("./Cookbook.json", (err, data) => {
        if (err) {
            return res.status(400).send("");
        }

        const cookBook = JSON.parse(data.toString());

        let recipe;
        for (const entry of cookBook) {
            if (entry.name === recipeName) {
                recipe = entry;
            }
        }

        if (!recipe || recipe.type !== "recipe") {
            return res.status(400).send("");
        }

        const summary = getRecipeInfo(recipeName, cookBook);
        if (!summary) {
            return res.status(400).send("");
        }
        return res.status(200).send({name: recipeName, cookTime: summary.time, ingredients: summary.ingredients })

    });
});

function getRecipeInfo(recipeName: string, cookBook: (ingredient | recipe)[], quantity?: number): {ingredients: {name: string, quantity: number}[], time: number} {
    
    const entry = cookBook.find(entry => entry.name === recipeName);
    if (!entry) {
        return null;
    }
    if (entry.type === "ingredient") {   
        return {ingredients: [{name: entry.name, quantity: quantity}], time: (entry as ingredient).cookTime}
    }
    let ingredients = [];
    for (const requiredItem of (entry as recipe).requiredItems) {
        const ingredient = getRecipeInfo(requiredItem.name, cookBook, requiredItem.quantity);
        if (!ingredient) {
            return null;
        }
        ingredients.push(...ingredient.ingredients);
    }
    
    ingredients.reduce((acc, item) => {
        const existing = acc.find(i => i.name === item.name);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
        
            acc.push(item);
        }
        return acc;
    })
    return {ingredients: ingredients, time: (entry as recipe).requiredItems.reduce((acc, item) => acc + getRecipeInfo(item.name, cookBook).time, 0)}

}


// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
    console.log(`Running on: http://127.0.0.1:8080`);
});
