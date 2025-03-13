$(document).ready(function() {
$(".select2").select2();
});

$("#imageModal").on("hidden.bs.modal", function() {
$(".modal-backdrop").remove();
$("body").removeClass("modal-open");
});
// Get CSRF token from hidden input field
const csrfToken = document.querySelector('input[name="_csrf"]').value;
// Form validation and error message
$(document).ready(function() {
let lastCheckedName = ""; // Store last checked name to prevent duplicate requests

$("#name").on("blur", function() {
let tripName = $(this).val().trim();
const tripId = $('#tripId').val()
if (tripName === "" || tripName === lastCheckedName) return; // Skip if empty or already checked

lastCheckedName = tripName; // Update last checked name

$.ajax({
url: "/getCheckToursUnique",
type: "POST",
headers: {
"X-CSRF-Token": csrfToken, // Ensure CSRF token is correctly set
},
data: {
name: tripName,
tripId: tripId || undefined, // Send tripId if updating, otherwise undefined
},
success: function(response) {
if (response.exists) {
$("#nameError").removeClass("d-none"); // Show error message
} else {
$("#nameError").addClass("d-none"); // Hide error message
}
},
error: function() {
console.error("Error checking trip name.");
},
});
});
});

// common method to show error on field
function showError(input, message) {
input.classList.add("is-invalid");
let errorSpan = input.nextElementSibling;
if (!errorSpan || !errorSpan.classList.contains("invalid-feedback")) {
errorSpan = document.createElement("div");
errorSpan.className = "invalid-feedback";
input.parentNode.appendChild(errorSpan);
}
errorSpan.textContent = message;
}
// common method to remoe error from the field
function removeError(input) {
input.classList.remove("is-invalid");
let errorSpan = input.nextElementSibling;
if (errorSpan && errorSpan.classList.contains("invalid-feedback")) {
errorSpan.remove();
}
}

// Main image preview section : functionality - set image on priview and also add or update the image , remove the image from the source
document.addEventListener("DOMContentLoaded", function() {
// Main image preview
const mainImageInput = document.getElementById("file");
const mainImagePreview = document.getElementById("mainImagePreview");
const mainImagePreviewContainer = document.getElementById("mainImagePreviewContainer");
const removeMainImageButton = document.getElementById("removeMainImage");
mainImagePreviewContainer.style.display = "block";
mainImagePreviewContainer.style.maxWidth = "200px"

// Ensure preview container is hidden initially if no image exists
if (!mainImagePreview.src || mainImagePreview.src === window.location.href) {
mainImagePreviewContainer.style.display = "none";
} else {
mainImagePreviewContainer.style.display = "block";
};

mainImageInput.addEventListener("change", function() {
const file = this.files[0];
if (file) {
const reader = new FileReader();
reader.onload = function(e) {
mainImagePreview.src = e.target.result;
mainImagePreview.style.display = "block";
mainImagePreviewContainer.style.display = "block"; // Ensure it is visible
removeMainImageButton.style.display = "block"; // Show remove button
};
reader.readAsDataURL(file);
}
});

// Clicking the preview image opens the modal
mainImagePreview.addEventListener("click", function() {
document.getElementById("fullSizeImage").src = this.src;
});

// Banner images preview (multiple)
const bannerImageInput = document.getElementById("bannerImages");
const bannerPreviewContainer = document.getElementById("bannerPreviewContainer");

bannerImageInput.addEventListener("change", function() {
bannerPreviewContainer.innerHTML = "";
if (this.files) {
Array.from(this.files).forEach(file => {
const reader = new FileReader();
reader.onload = function(e) {
const img = document.createElement("img");
img.src = e.target.result;
img.classList.add("img-thumbnail");
img.setAttribute("data-bs-toggle", "modal");
img.setAttribute("data-bs-target", "#imageModal");
img.addEventListener("click", function() {
document.getElementById("fullSizeImage").src = this.src;
});
bannerPreviewContainer.appendChild(img);
};
reader.readAsDataURL(file);
});
}
});
// Remove main image
$("#removeMainImage").click(function() {
$("#mainImagePreview").attr("src", ""); // Clear src
$("#mainImagePreviewContainer").hide(); // Hide container
$("#file").val(""); // Reset file input
});
});

document.addEventListener("DOMContentLoaded", function() {
const cityContainer = document.getElementById("cityContainer");
const addCityButton = document.getElementById("addCity");
let selectedCities = new Set();

// Fetch cities and populate dropdown
async function fetchCities() {
try {
const response = await fetch("/getCityList");
const data = await response.json();
return data.success ? data.cities : [];
} catch (error) {
console.error("Error fetching cities:", error);
return [];
}
}

// Populate city dropdown
async function populateCityDropdown(selectElement) {
const cities = await fetchCities();
selectElement.innerHTML = '<option value="">Select City</option>';
cities.forEach((city) => {
const option = document.createElement("option");
option.value = city.name;
option.textContent = city.name;
option.dataset.state = city.state;
option.dataset.image = city.image;
selectElement.appendChild(option);
});
}

// Handle city selection (event delegation)
cityContainer.addEventListener("change", function(event) {
if (event.target.classList.contains("city-select")) {
const select = event.target;
const selectedOption = select.options[select.selectedIndex];
const cityName = selectedOption.value;
const cityEntry = select.closest(".city-entry");
const stateField = cityEntry.querySelector(".state-field");
const imageField = cityEntry.querySelector(".city-image");

if (cityName && !selectedCities.has(cityName)) {
stateField.value = selectedOption.dataset.state;
imageField.src = selectedOption.dataset.image;
imageField.style.display = "block";
selectedCities.add(cityName);
} else {
stateField.value = "";
imageField.src = "";
imageField.style.display = "none";
selectedCities.delete(cityName);
}
}
});

// Handle click event for dynamically generated images
cityContainer.addEventListener("click", function(event) {
if (event.target.classList.contains("city-image")) {
const fullSizeImage = document.getElementById("fullSizeImage");
const imageModal = new bootstrap.Modal(document.getElementById("imageModal"));

if (event.target.src) {
fullSizeImage.src = event.target.src;
imageModal.show();
}
}
});

// Function to add a new city section
let newCityEntry = null;
async function addCitySection() {
newCityEntry = document.createElement("div");
newCityEntry.classList.add("city-entry", "mb-3");
newCityEntry.innerHTML = `
<div class="col-md-2">
  <button class="btn btn-danger remove-city mt-4">Remove</button>
</div>
<div class="city-entry">
  <div class="row">
    <div class="col-12 text-end">
      <button type="button" class="btn btn-danger btn-sm remove-city d-none">
        <i class="bi bi-x-circle"></i> Remove Section
      </button>
    </div>
  </div>
  <div class="row">
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label>City</label>
        <select class="form-select city-select" required>
          <option value="">Select City</option>
        </select>
      </div>
    </div>
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label>City Image</label>
        <img src="" class="img-fluid city-image" style="display: none; max-width: 100px;">
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label>State</label>
        <input type="text" class="form-control state-field" placeholder="State" readonly required>
      </div>
    </div>
  </div>
  <h5 class="mt-3">Pricing Details</h5>
  <div class="row">
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label for="basePrice" class="form-label">Base Price (Total trip cost)</label>
        <input type="number" class="form-control cost-field" id="basePrice" placeholder="Enter base price" required>
      </div>
    </div>
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label>Transfer Type</label>
        <input type="text" class="form-control transferType" name="transferType" placeholder="Transfer Type" required>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label for="childPrice" class="form-label">Child Price</label>
        <input type="number" class="form-control" name="childPrice" id="childPrice" placeholder="Enter price per child" required />
      </div>
    </div>
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label for="adultPrice" class="form-label">Adult Price</label>
        <input type="number" class="form-control adultPrice" id="adultPrice" placeholder="Enter price per adult" required>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <label for="infantPrice" class="form-label">Infant Price</label>
        <input type="number" class="form-control" name="infantPrice" id="infantPrice" placeholder="Enter price per infant (if applicable)" />
      </div>
    </div>
    <!-- Date Picker Input -->
    <div class="col-12 col-md-6">
      <div class="mb-3">
        <h6 class="mt-3">Available Dates</h5>
          <div class="input-group">
            <input type="text" id="datePicker" class="form-control datePicker" placeholder="Select multiple dates">
            <button class="btn btn-danger clearDates" id="clearDates">Clear</button>
          </div>
          <small class="text-danger d-none error-msg" id="error-msg">Please select at least one date.</small>
      </div>
    </div>
  </div>
  <div class="row">
    <!-- Scrollable Table for Selected Dates -->
    <div class="col-12 col-md-12">
      <div class="mb-3">
        <label class="form-label fw-bold"></label>
        <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
          <table class="table table-bordered table-hover align-middle">
            <thead class="table-light sticky-top">
              <tr>
                <th class="text-center" style="width: 10%;">S.No.</th>
                <th class="text-center" style="width: 60%;">Selected Date</th>
                <th class="text-center" style="width: 30%;">Action</th>
              </tr>
            </thead>
            <tbody id="datePreview">
              <!-- Dynamic Rows Will Be Inserted Here -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-12 d-flex mb-3">
      <button type="button" class="btn btn-primary btn-sm addCity" id="addCity">
        <i class="bi bi-plus-circle"></i> Add City
      </button>
    </div>
  </div>
</div>
`;

cityContainer.appendChild(newCityEntry);
const newSelect = newCityEntry.querySelector(".city-select");
await populateCityDropdown(newSelect);
// Reinitialize flatpickr for the new date picker input
let datePickerInput = newCityEntry.querySelector(".datePicker");
flatpickr(datePickerInput, {
mode: "multiple",
dateFormat: "Y-m-d",
minDate: "today",
enableTime: false,
onClose: function(selectedDatesArr) {
let selectedDates = selectedDatesArr.map(date => date.toISOString().split("T")[0]);
updateDatePreview(datePickerInput, selectedDates);
}
});
}

// Event listener to add a new city section
addCityButton.addEventListener("click", function() {
addCitySection();
});

// Handle removing a city section
cityContainer.addEventListener("click", function(event) {
if (event.target.classList.contains("remove-city")) {
const cityEntry = event.target.closest(".city-entry");
if (cityEntry) {
cityContainer.removeChild(cityEntry);
}
}
});

// Initialize first dropdown
populateCityDropdown(document.querySelector(".city-select"));

let selectedDates = [];
let datePickerInput = cityContainer.querySelector(".datePicker");
flatpickr('#datePicker', {
mode: "multiple",
dateFormat: "Y-m-d",
minDate: "today",
enableTime: false,
onClose: function(selectedDatesArr) {
let selectedDates = selectedDatesArr.map(date => date.toISOString().split("T")[0]);
updateDatePreview(datePickerInput, selectedDates);
}
});

function updateDatePreview(inputElement, selectedDates) {
let cityEntry = inputElement.closest(".city-entry");
let datePreviewEl = cityEntry.querySelector("#datePreview");

datePreviewEl.innerHTML = "";
selectedDates.forEach((date, index) => {
let row = `
<tr>
  <td class="text-center">${index + 1}</td>
  <td class="text-center">${date}</td>
  <td class="text-center">
    <button class="btn btn-danger btn-sm remove-date" data-date="${date}">Remove</button>
  </td>
</tr>
`;
datePreviewEl.innerHTML += row;
});


}


document.querySelectorAll(".remove-btn").forEach(button => {
button.addEventListener("click", function() {
let dateToRemove = this.getAttribute("data-date");
removeDate(dateToRemove);
});
});

function removeDate(date) {
selectedDates = selectedDates.filter(d => d !== date);
fp.setDate(selectedDates, true);
updateDatePreview();
}

document.getElementById("clearDates").addEventListener("click", function(e) {
e.preventDefault();
selectedDates = [];
fp.clear();
updateDatePreview();
});

// Convert selectedDates to MongoDB Format
function formatForMongoDB() {
let groupedData = {};

selectedDates.forEach(date => {
let [year, month, day] = date.split("-");

let monthName = new Date(date).toLocaleString("en-US", {
month: "long"
});

if (!groupedData[`${year}-${monthName}`]) {
groupedData[`${year}-${monthName}`] = {
year: year,
month: monthName,
dates: []
};
}
groupedData[`${year}-${monthName}`].dates.push(day);
});
let formattedArray = Object.values(groupedData).map(entry => ({
year: entry.year,
month: entry.month,
dates: entry.dates.join(", ")
}));

return formattedArray;
}

});

//** Add calender date and other for manage months**
// function initializeFlatpickr(selector) {
// return flatpickr(selector, {
// mode: "multiple",
// dateFormat: "Y-m-d",
// minDate: "today",
// enableTime: false,
// onClose: function(selectedDatesArr, instance) {
// let selectedDates = selectedDatesArr.map(date => date.toISOString().split("T")[0]);
// updateDatePreview(selectedDates, instance.element);
// }
// });
// };

// **End of the calender dateand other for manage monthes**

//** Mange about section and other section textEditor **//
// Store all Quill editors
const editorsd = {};
// Define all section editor IDs
const editorIds = ["about-editor", "placestovisit-editor", "activities-editor", "things_to_carry-editor", "includenexclude-editor", "package_cost-editor", "infonfaq-editor", "guidelines-editor", "bookncancel-editor"];

// Loop through each section and create a Quill editor
editorIds.forEach(editorId => {
editorsd[editorId] = new Quill(`#${editorId}`, {
theme: "snow",
modules: {
toolbar: [
[{
'header': [1, 2, 3, 4, 5, 6, false]
}],
[{
'font': []
}],
[{
'size': ['small', false, 'large', 'huge']
}],
['bold', 'italic', 'underline', 'strike'],
[{
'script': 'sub'
}, {
'script': 'super'
}],
[{
'list': 'ordered'
}, {
'list': 'bullet'
}],
[{
'indent': '-1'
}, {
'indent': '+1'
}],
[{
'align': []
}],
[{
'color': []
}, {
'background': []
}],
['blockquote'],
['link'],
['clean']
],
imageResize: {
displayStyles: {
backgroundColor: 'black',
border: 'none',
color: 'white'
},
modules: ['Resize', 'DisplaySize', 'Toolbar']
}
}
});
});
//** End of all type of textEditor section ** //

//** New Itinerary day section start from here **/
// Mange iternity section textEditor section config with image upload
let dayCount = 1;
let editors = {};
Quill.register('modules/imageResize', window.ImageResize.default);
// Function to initialize Quill editor
function initializeEditor(editorId) {
editors[editorId] = new Quill(`#${editorId}`, {
theme: "snow",
modules: {
toolbar: [
[{
'header': [1, 2, 3, 4, 5, 6, false]
}], // All header sizes
[{
'font': []
}], // Font family
[{
'size': ['small', false, 'large', 'huge']
}], // Font size
['bold', 'italic', 'underline', 'strike'], // Text formatting
[{
'script': 'sub'
}, {
'script': 'super'
}], // Subscript & Superscript
[{
'list': 'ordered'
}, {
'list': 'bullet'
}], // Lists
[{
'indent': '-1'
}, {
'indent': '+1'
}], // Indentation
[{
'align': []
}], // Text align (left, center, right, justify)
[{
'color': []
}, {
'background': []
}], // Text & background color
['blockquote'], // Blockquote & Code block
['link', 'image', ], // Media tools
['clean'] // Clear formatting
],
imageResize: {
displayStyles: {
backgroundColor: 'black',
border: 'none',
color: 'white'
},
modules: ['Resize', 'DisplaySize', 'Toolbar']
}
}
});

// Sync content with hidden input field
editors[editorId].on("text-change", function() {
document.querySelector(`#${editorId}`).nextElementSibling.value = editors[editorId].root.innerHTML;
});

// Handle image selection & upload
editors[editorId].getModule('toolbar').addHandler('image', () => {
let input = document.createElement('input');
input.setAttribute('type', 'file');
input.setAttribute('accept', 'image/*');
input.click();

input.onchange = async () => {
const file = input.files[0];

if (!file) return;

// Validate file type
const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
if (!allowedTypes.includes(file.type)) {
alert('Only JPG, JPEG, and PNG images are allowed.');
return;
}

// Validate file size (Max 2MB)
if (file.size > 2 * 1024 * 1024) {
alert('File size should not exceed 2MB.');
return;
}

let formData = new FormData();
formData.append('_csrf', csrfToken);
const timestamp = new Date().toISOString().replace(/:/g, '-');
const fileName = `${timestamp}-${file.name}`;
file.originalname = fileName;
formData.append('image', file);

try {
const response = await fetch('/uploadImage', {
method: 'POST',
headers: {
'X-CSRF-Token': csrfToken
},
body: formData
});

const result = await response.json();

if (response.ok && result.success) {
let range = editors[editorId].getSelection();
editors[editorId].insertEmbed(range.index, 'image', result.imageUrl);
} else {
alert(result.message || 'Failed to upload image.');
}
} catch (error) {
console.error('Upload Error:', error);
alert('Something went wrong while uploading the image.');
}
};
});
}
// Initialize first editor
initializeEditor("editor-1");

// Add new itinerary day
document.getElementById("add-day").addEventListener("click", function() {
event.preventDefault(); // Prevent page scroll or refresh
dayCount++;
let newEditorId = `editor-${dayCount}`;
let newDay = document.createElement("div");
newDay.classList.add("itinerary-day", "border", "rounded", "p-3", "mb-3");
newDay.setAttribute("data-day", dayCount);
newDay.innerHTML = `
<h5>Day ${dayCount}</h5>
<input type="text" class="form-control" name="itinerary-header" id="itinerary-header" placeholder="Enter Header" value="" required="" />
<div class="editor-container mb-3" id="${newEditorId}"></div>
<input type="hidden" name="content[]" class="quill-content">
`;
document.getElementById("itinerary-container").appendChild(newDay);
initializeEditor(newEditorId);

// Enable remove button
document.getElementById("remove-day").disabled = false;
});

// Remove last itinerary day
document.getElementById("remove-day").addEventListener("click", function() {
event.preventDefault(); // Prevent page scroll or refresh
if (dayCount > 1) {
let lastDay = document.querySelector(`.itinerary-day[data-day="${dayCount}"]`);
lastDay.remove();
delete editors[`editor-${dayCount}`]; // Remove editor instance
dayCount--;
// Disable remove button if only one editor remains
if (dayCount === 1) {
document.getElementById("remove-day").disabled = true;
}
}
});

//** Itinerary day section end here **/

//*** Submit form section logic **/
document.getElementById('addUpdateTripDetial').addEventListener('submit', async (e) => {
e.preventDefault();
const formData = new FormData(e.target);
const response = await fetch(e.target.action, {
method: 'POST',
body: formData,
headers: {
'X-CSRF-Token': csrfToken
}
});
// Collect basic trip details
// formData.append("name", $("#name").val());
// formData.append("state", $("#state").val());
// formData.append("destinations", $("#destinations").val());
// formData.append("route", $("#route").val());
// formData.append("days", $("#days").val());
// formData.append("tag", $("#tag").val());
// formData.append("price", $("#price").val());
// formData.append("tripType", $("#tripType").val());
// formData.append("altitude", $("#altitude").val());
// formData.append("bestSession", $("#bestSession").val());
// formData.append("placestovisit", $("#placestovisit").val());
// formData.append("activities", $("#activities").val());
// formData.append("includenexclude", $("#includenexclude").val());
// formData.append("package_cost", $("#package_cost").val());
// formData.append("Bookncancel", $("#Bookncancel").val());
// formData.append("guidelines", $("#guidelines").val());
// formData.append("infonfaq", $("#infonfaq").val());

// // Handle image uploads
// let mainImage = $("#file")[0].files[0];
// if (mainImage) {
// formData.append("image", mainImage);
// }

// let bannerImages = $("#bannerImages")[0].files;
// let bannerImageArr = [];
// for (let i = 0; i

< bannerImages.length; i++) { // formData.append("bannerImages", bannerImages[i]); // } // Collect departure city data // let depCityData=[]; // let datesArray=[]; // $(".city-entry").each(function() { // let state=$(this).find(".state-field").val(); // let city=$(this).find(".city-select").val(); // let perPersonCost=$(this).find(".cost-field").val(); // $(this).find(".month-entry").each(function() { // let month=$(this).find(".month-select").val(); // let dates=$(this).find(".date-select").val(); // if (month && dates) { // datesArray.push({ // Month: month, // dates: dates // }); // } // }); // if (state && city && perPersonCost) { // depCityData.push({ // State: state, // City: city, // PerPersonCost: parseInt(perPersonCost), // dates: datesArray // }); // } // }); // formData.append("deptcities", JSON.stringify(depCityData)); // // Append trip_dates separately // formData.append("trip_dates", JSON.stringify(datesArray)); // // Collect itinerary data // let itineraryData=[]; // $(".itinerary-day").each(function() { // let day="Day " + $(this).attr("data-day"); // // ✅ Select input field by name (since ID is repeated) // let itinerarydayHeader=$(this).find("input[name='itinerary-header' ]").val() || "" ; // // ✅ Get editor ID and fetch Quill content safely // let editorId=$(this).find(".editor-container").attr("id"); // let description=editorId && editors[editorId] ? editors[editorId].root.innerHTML : "" ; // itineraryData.push({ // day: day, // header: itinerarydayHeader, // description: description, // }); // }); // formData.append("itinerary", JSON.stringify(itineraryData)); // formData.append("about", $("#about").val()); // formData.append("inclusions", $("#inclusions").val()); // formData.append("exclusions", $("#exclusions").val()); // formData.append("shortItinerary", $("#shortItinerary").val()); // formData.append("things_to_carry", $("#things_to_carry").val()); // formData.append("termsConditions", $("#termsConditions").val()); // formData.append("faq", $("#faq").val()); // AJAX call to API // $.ajax({ // url: "/admin/postNewAddTours" , // Change to your backend API URL // type: "POST" , // headers: { // 'X-CSRF-Token' : csrfToken // }, // data: formData, // processData: false, // contentType: false, // success: function(response) { // alert("Trip successfully added!"); // console.log(response); // }, // error: function(error) { // console.error("Error:", error); // alert("Something went wrong!"); // } // }); });