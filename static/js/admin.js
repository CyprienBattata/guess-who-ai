"use strict";

// Get all the delete buttons
const deleteButtons = document.querySelectorAll(".delete-button");

// Attach event listener to each delete button
deleteButtons.forEach((button) => {
    // Get the imgid attribute of the button
    const imgId = button.getAttribute("imgid");

    // Add click event listener to the delete button
    button.addEventListener("click", () => {
        // Send the fetch request to https://example.com
        fetch(`/images/${imgId}`, {
            method: "DELETE", // You can change the HTTP method as per your requirement
        });
    });
});
