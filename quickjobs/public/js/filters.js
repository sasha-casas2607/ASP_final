document.addEventListener("DOMContentLoaded", () => {
    // Filters
    const filtersList = document.getElementById("filters-list");
    const filterItems = filtersList.children;

    for (let i = 0; i < filterItems.length; i++) {
        filterItems[i].addEventListener("click", () => {
            console.log("Clicked on " + filterItems[i].id);
        })
    }

    // Sort by
    const sortBy = document.getElementById("sort-by");

    sortBy.addEventListener("click", (e) => {
        console.log("Clicked on " + sortBy.id);
    })
})