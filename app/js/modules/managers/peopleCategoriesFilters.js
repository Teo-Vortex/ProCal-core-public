(function initPeopleCategoriesFiltersModule(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function hasPersonName(name, options) {
    const o = options || {};
    const people = Array.isArray(o.people) ? o.people : [];
    const needle = String(name || "").toLowerCase();
    return people.some((p) => String((p && p.name) || "").toLowerCase() === needle);
  }

  function resetPersonEditor(options) {
    const o = options || {};
    if (typeof o.setEditingPersonId === "function") o.setEditingPersonId(null);
    if (o.personForm && typeof o.personForm.reset === "function") o.personForm.reset();
    if (o.personColorInput) o.personColorInput.value = String(o.defaultPersonColor || "");
    if (typeof o.applyTranslations === "function") o.applyTranslations();
  }

  function resetCategoryEditor(options) {
    const o = options || {};
    if (typeof o.setEditingCategoryId === "function") o.setEditingCategoryId(null);
    if (o.categoryForm && typeof o.categoryForm.reset === "function") o.categoryForm.reset();
    if (o.categoryColorInput) o.categoryColorInput.value = String(o.defaultCategoryColor || "");
    if (typeof o.applyTranslations === "function") o.applyTranslations();
  }

  function renderPeopleManager(options) {
    const o = options || {};
    if (!o.peopleList) return;
    const people = Array.isArray(o.people) ? o.people : [];
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    o.peopleList.innerHTML = "";
    if (!people.length) {
      o.peopleList.innerHTML = `<li class="empty">${t("noPeopleAdded")}</li>`;
      return;
    }

    people.forEach((person) => {
      const li = document.createElement("li");
      li.className = "person-item";

      const left = document.createElement("span");
      left.textContent = String((person && person.name) || "");
      left.style.color = String((person && person.color) || "");

      const actions = document.createElement("div");
      actions.className = "person-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "delete-btn";
      edit.textContent = t("edit");
      edit.addEventListener("click", () => {
        if (typeof o.onEditPerson === "function") o.onEditPerson(person);
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.textContent = t("delete");
      del.addEventListener("click", () => {
        if (typeof o.onDeletePerson === "function") o.onDeletePerson(person);
      });

      actions.append(edit, del);
      li.append(left, actions);
      o.peopleList.appendChild(li);
    });
  }

  function renderCategoriesManager(options) {
    const o = options || {};
    if (!o.categoriesList) return;
    const categories = Array.isArray(o.categories) ? o.categories : [];
    const t = typeof o.t === "function" ? o.t : ((k) => k);
    o.categoriesList.innerHTML = "";
    if (!categories.length) {
      o.categoriesList.innerHTML = `<li class="empty">${t("noCategories")}</li>`;
      return;
    }

    categories.forEach((cat) => {
      const li = document.createElement("li");
      li.className = "person-item";
      const left = document.createElement("span");
      left.textContent = String((cat && cat.name) || "");
      left.style.color = String((cat && cat.color) || "");

      const actions = document.createElement("div");
      actions.className = "person-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "delete-btn";
      edit.textContent = t("edit");
      edit.addEventListener("click", () => {
        if (typeof o.onEditCategory === "function") o.onEditCategory(cat);
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.textContent = t("delete");
      del.addEventListener("click", () => {
        if (typeof o.onDeleteCategory === "function") o.onDeleteCategory(cat);
      });

      actions.append(edit, del);
      li.append(left, actions);
      o.categoriesList.appendChild(li);
    });
  }

  function getActiveFilterCount(options) {
    const o = options || {};
    const activeFilters = o.activeFilters || {};
    const categoriesSize = activeFilters.categoryIds && typeof activeFilters.categoryIds.size === "number"
      ? activeFilters.categoryIds.size
      : 0;
    const peopleSize = activeFilters.peopleIds && typeof activeFilters.peopleIds.size === "number"
      ? activeFilters.peopleIds.size
      : 0;
    return categoriesSize + peopleSize;
  }

  function updateFiltersButtonState(options) {
    const o = options || {};
    const filtersBtn = o.filtersBtn;
    if (!filtersBtn) return;
    const count = getActiveFilterCount({ activeFilters: o.activeFilters });
    const active = count > 0;
    const t = typeof o.t === "function" ? o.t : ((k) => k);

    filtersBtn.classList.toggle("filters-active", active);
    filtersBtn.dataset.activeFilters = String(count);

    if (active) {
      filtersBtn.style.borderColor = "#22c55e";
      filtersBtn.style.boxShadow = "0 0 0 2px rgba(34, 197, 94, 0.18)";
      filtersBtn.style.background = "rgba(236, 253, 245, 0.95)";
    } else {
      filtersBtn.style.borderColor = "";
      filtersBtn.style.boxShadow = "";
      filtersBtn.style.background = "";
    }

    const label = t("filtersTitle");
    filtersBtn.title = active ? `${label} (${count})` : label;
  }

  function createFilterRow(value, checked, labelText, color, onChange) {
    const row = document.createElement("label");
    row.className = "check-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(value || "");
    input.checked = Boolean(checked);
    if (typeof onChange === "function") input.addEventListener("change", () => onChange(input.checked));
    const span = document.createElement("span");
    span.textContent = String(labelText || "");
    if (color) span.style.color = color;
    row.append(input, span);
    return row;
  }

  function renderFilters(options) {
    const o = options || {};
    const categoryFilterList = o.categoryFilterList;
    const peopleFilterList = o.peopleFilterList;
    const categories = Array.isArray(o.categories) ? o.categories : [];
    const activeFilters = o.activeFilters || {};
    const getOperationalPeople = typeof o.getOperationalPeople === "function" ? o.getOperationalPeople : () => [];
    const getPersonDisplayName = typeof o.getPersonDisplayName === "function" ? o.getPersonDisplayName : ((p) => String((p && p.name) || ""));
    const onFiltersChanged = typeof o.onFiltersChanged === "function" ? o.onFiltersChanged : (() => {});

    if (categoryFilterList) {
      categoryFilterList.innerHTML = "";
      categories.forEach((cat) => {
        const row = createFilterRow(
          cat.id,
          Boolean(activeFilters.categoryIds && activeFilters.categoryIds.has(cat.id)),
          cat.name,
          cat.color,
          (checked) => {
            if (activeFilters.categoryIds) {
              if (checked) activeFilters.categoryIds.add(cat.id);
              else activeFilters.categoryIds.delete(cat.id);
            }
            onFiltersChanged();
          }
        );
        categoryFilterList.appendChild(row);
      });
    }

    if (peopleFilterList) {
      peopleFilterList.innerHTML = "";
      const roster = getOperationalPeople();
      roster.forEach((person) => {
        const row = createFilterRow(
          person.id,
          Boolean(activeFilters.peopleIds && activeFilters.peopleIds.has(person.id)),
          getPersonDisplayName(person, roster),
          person.color,
          (checked) => {
            if (activeFilters.peopleIds) {
              if (checked) activeFilters.peopleIds.add(person.id);
              else activeFilters.peopleIds.delete(person.id);
            }
            onFiltersChanged();
          }
        );
        peopleFilterList.appendChild(row);
      });
    }
  }

  root.ProCalModules.peopleCategoriesFilters = {
    hasPersonName,
    resetPersonEditor,
    resetCategoryEditor,
    renderPeopleManager,
    renderCategoriesManager,
    getActiveFilterCount,
    updateFiltersButtonState,
    renderFilters
  };
})(window);

