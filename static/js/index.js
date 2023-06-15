"use strict";

// --- HELPER FUNCTIONS ---
async function filter(arr, callback) {
    const fail = Symbol();
    return (
        await Promise.all(
            arr.map(async (item) => ((await callback(item)) ? item : fail))
        )
    ).filter((i) => i !== fail);
}

// --- GPT FUNCTIONS ---

const questionsBattery = {
    hairColor: "What color is the character's hair?",
    hairStyle: "How would you describe the character's hairstyle?",
    eyeColor: "What color are the character's eyes?",
    facialHair:
        "Does the character have any facial hair or unique facial features?",
    glasses: "Does the character wear any glasses or eyewear?",
    hat: "Is the character wearing any headwear, like a hat or cap?",
    accessory: "Does the character have any distinctive accessory or item?",
    mood: "Is the character happy or sad ?",
    species: "What is the species of the character ?",
    skinColor: "What is the main skin color of the character ?",
    action: "What is the character doing ?",
    facialExpression: "What is the facial expression of the character ?",
    feathers: "Does the character have feathers ?",
    hairs: "Does the character have hairs ?",
};

function stringifyPersons() {
    let copies = structuredClone(persons);

    copies.map((person) => {
        delete person.imgId;
        delete person.imgLink;
    });

    return JSON.stringify(copies);
}

async function askGpt() {
    const apiKey = "<api-key>";
    const apiUrl = "https://api.openai.com/v1/chat/completions";

    let messages = [
        {
            role: "system",
            content: "You are currently playing a game of Guess Who.",
        },
        {
            role: "user",
            content: `${stringifyPersons()} Using these informations as JSON, try to narrow down the possibilities by trying to guess a secret person's characteristic or by guessing directly the secret's person name. You only have right to one question. You must formulate the question using : "Does the person have ... ?" or "Is the person happy/sad ?"`,
        },
    ];

    console.log(messages[1].content);

    const requestBody = {
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 70, // Adjust the number of tokens as needed
        temperature: 1, // Adjust the temperature as needed
    };

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error("API request failed.");
        }

        const data = await response.json();
        const gptAnswer = data.choices[0].message.content;
        return gptAnswer;
    } catch (error) {
        console.error("Error:", error.message);
        // Handle error as desired
        return "";
    }
}

// --- GAME FUNCTIONS ---

async function askQA(question, imgId) {
    let data = await fetch(`/vqa/${imgId}`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ question }),
    });
    data = await data.json();
    return data.answer;
}

// Function to init game variables
async function init() {
    persons = [];

    let cache = localStorage.getItem("persons");

    if (cache && JSON.parse(cache)?.[0]?.gender) {
        persons = JSON.parse(cache);

        randomPerson = persons[Math.floor(Math.random() * persons.length)];
        console.log(randomPerson);
        return;
    }

    let data;

    try {
        data = await fetch("/images/");
        data = await data.json();
    } catch (error) {
        console.log(error);
    }

    const resultsList = document.getElementById("resultsList");
    resultsList.innerHTML = ""; // Clear the previous results

    const progress = document.createElement("div");
    progress.className = "progress my-3";
    progress.role = "progressbar";

    const progressBar = document.createElement("div");
    progressBar.className =
        "progress-bar progress-bar-striped progress-bar-animated w-0";

    progress.appendChild(progressBar);
    resultsList.appendChild(progress);

    let progressValue = 0;
    let maxValue = Object.keys(questionsBattery).length * data.length;

    // Generate a list of persons
    for (let image of data) {
        const imgId = image.substring(0, image.lastIndexOf("."));
        const imgLink = `/images/${imgId}`;
        const imgNameRaw = await fetch(`/name/${imgId}`);
        const imgName = await imgNameRaw.json();

        const person = {
            name: imgName["name"],
            imgLink,
            imgId,
        };

        if (player == "gpt") {
            for (let key in questionsBattery) {
                const answer = await askQA(questionsBattery[key], imgId);
                person[key] = answer;
                progressValue++;
                const displayValue = Math.round(
                    (progressValue / maxValue) * 100
                );
                progressBar.style.width = `${displayValue}%`;
            }
        }

        persons.push(person);
    }

    localStorage.setItem("persons", JSON.stringify(persons));

    randomPerson = persons[Math.floor(Math.random() * persons.length)];
    console.log(randomPerson);
}

// Function to update the displayed list based on the modified persons
function updateList() {
    const resultsList = document.getElementById("resultsList");
    resultsList.innerHTML = ""; // Clear the previous results

    persons.forEach((person) => {
        const listItem = document.createElement("li");
        const imgItem = document.createElement("img");
        const nameItem = document.createElement("span");

        listItem.className = "list-group-item d-flex align-items-center py-3";
        imgItem.className = "rounded-circle me-3";
        nameItem.className = "fw-bold";

        imgItem.src = person.imgLink;
        nameItem.innerHTML = person.name;

        listItem.appendChild(imgItem);
        listItem.appendChild(nameItem);
        resultsList.appendChild(listItem);
    });
}

// Function to handle the guess
async function handleGuess() {
    let guess;

    if (player == "human") {
        const guessInput = document.getElementById("guessInput");
        guess = guessInput.value.trim();
        guessInput.value = ""; // Clear the input field
    } else if (player == "gpt") {
        guess = await askGpt();
        console.log(guess);
    }

    const verifyNameResult = verifyName(guess);

    let matchingPersons = [];

    if (verifyNameResult.length == 0) {
        const expectedAnswer = await askQA(guess, randomPerson.imgId);

        if (player == "human") {
            alert(
                expectedAnswer.charAt(0).toUpperCase() +
                    expectedAnswer.substring(1)
            );
        } else {
            console.log(expectedAnswer);
        }

        matchingPersons = await filter(persons, async (person) => {
            const answer = await askQA(guess, person.imgId);

            return answer == expectedAnswer;
        });
    }

    if (
        (matchingPersons.length == 1 && matchingPersons[0] == randomPerson) ||
        randomPerson.name in verifyNameResult
    ) {
        alert(
            "You have found the right person who was " +
                randomPerson.name +
                " !"
        );
        alert("Another game will be launched !");
        // await init();
        // updateList();
    } else if (verifyNameResult.length != 0) {
        alert("The person is not named like you guessed !");
        persons = persons.filter((person) => {
            return person.name != verifyNameResult[0];
        });
        updateList();
    } else if (matchingPersons.includes(randomPerson)) {
        persons = matchingPersons;
        updateList();
    } else {
        persons = persons.filter((person) => !matchingPersons.includes(person));
        updateList();
    }
}

function verifyName(guess) {
    let return_value = [];

    for (let person of persons) {
        if (guess.includes(person.name)) {
            return_value.push(person.name);
            break;
        }
    }

    return return_value;
}

function togglePlayer() {
    const guessInput = document.getElementById("guessInput");

    if (player === "human") {
        player = "gpt";
        guessInput.style.display = "none";
    } else {
        player = "human";
        guessInput.style.display = "inline-block";
    }
    document.getElementById("toggleButton").textContent = "Player : " + player;
    init().then(() => updateList());
}

document
    .getElementById("guessInput")
    .addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            // 13 is the keycode for Enter key
            event.preventDefault(); // Prevent form submission
            document.getElementById("submitButton").click(); // Trigger the button click event
        }
    });

// ---- GAME VARIABLES ---

// Persons
let persons = [];

// The random person
let randomPerson;

// Can be either gpt or human
let player = "human";

// --- GAME ---

init().then(() => updateList());
