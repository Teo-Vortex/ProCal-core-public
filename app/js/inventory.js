(function initInventoryPage() {
  "use strict";

  const ACCESS_KEY = "procal_access_token";
  const state = {
    lang: localStorage.getItem("procal_lang") === "bg" ? "bg" : "en",
    items: [], locations: [], users: [], settings: null, abilities: {}, movements: [],
    selectedItemId: "", editingItemId: "", reverseMovementId: "", qrPayload: "", qrDataUrl: "", qrItem: null, mediaStream: null,
    catalogFilter: "all", showAllLocations: false
  };
  const ids = [
    "pageTitle","pageSubtitle","langBtn","backBtn","searchInput","scanBtn","newItemBtn","locationsBtn","settingsBtn",
    "itemsMetricLabel","itemsMetric","unitsMetricLabel","unitsMetric","lowMetricLabel","lowMetric","criticalMetricLabel","criticalMetric",
    "catalogTitle","catalogFilters","itemCount","itemList","detailEmpty","detailContent","pageStatus","itemModal","itemModalTitle","itemForm","itemSku",
    "itemName","itemCategory","itemUnit","itemLow","itemCritical","itemRestock","itemInitialLocation","itemInitialQuantity","initialLocationWrap",
    "initialQuantityWrap","itemNotifications","itemActive","activeWrap","itemDescription","saveItemBtn","skuLabel","nameLabel","categoryLabel",
    "unitLabel","lowLabel","criticalLabel","restockLabel","initialLocationLabel","initialQuantityLabel","itemNotificationsLabel","activeLabel",
    "descriptionLabel","movementModal","movementTitle","movementForm","movementType","movementQuantity","movementSource","movementDestination",
    "movementDirection","adjustmentMode","movementReason","movementNote","movementStatus","movementAvailability","movementSummary","sourceWrap","destinationWrap","directionWrap","adjustmentModeWrap","movementTypeLabel","quantityLabel","sourceLabel",
    "destinationLabel","directionLabel","adjustmentModeLabel","reasonLabel","noteLabel","saveMovementBtn","locationsModal","locationsTitle","locationForm","locationName",
    "locationDescription","locationNameLabel","locationDescriptionLabel","addLocationBtn","locationList","settingsModal","settingsTitle","settingsForm",
    "notificationsEnabled","inAppEnabled","pushEnabled","notifyManagers","notifyOnRestored","repeatHours","recipientList","notificationsEnabledLabel",
    "inAppEnabledLabel","pushEnabledLabel","notifyManagersLabel","notifyOnRestoredLabel","repeatHoursLabel","recipientsLabel","saveSettingsBtn","qrModal",
    "qrTitle","qrImage","qrItemCode","qrPayload","newQrBtn","downloadQrBtn","copyQrBtn","scanModal","scanTitle","scanHelp","scanPayload","submitScanBtn",
    "historyModal","historyTitle","historyHelp","historySearch","historyTypeFilter","historyLocationFilter","historyPeriodFilter","historyList",
    "scanActionModal","scanActionTitle","scanActionItem","scanReceiveBtn","scanIssueBtn","scanTransferBtn",
    "reverseModal","reverseTitle","reverseForm","reverseReasonLabel","reverseReasonInput","saveReverseBtn"
  ];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

  const I18N = {
    en: {
      title:"Inventory",subtitle:"Stock and movements",back:"Back",search:"Search by name, SKU or category",scan:"Scan QR",newItem:"New item",
      locations:"Locations",notifications:"Notifications",items:"Items",totalQuantity:"Total quantity",lowStock:"Low stock",critical:"Critical",catalog:"Catalog",
      selectItem:"Select an item.",noItems:"No matching items.",inactive:"Inactive",normal:"Normal",low:"Low",stockByLocation:"Stock by location",
      movements:"Recent movements",movementTitle:"Stock movement",noMovements:"No movements for this item.",edit:"Edit",itemQr:"Item QR",receive:"Receive",issue:"Issue",transfer:"Transfer",
      adjustment:"Adjustment",newItemTitle:"New item",editItemTitle:"Edit item",close:"Close",sku:"SKU / code",name:"Name",category:"Category",unit:"Unit",
      lowThreshold:"Low-stock threshold",criticalThreshold:"Critical threshold",restockTarget:"Restock target",initialLocation:"Initial location",
      initialQuantity:"Initial quantity",stockNotifications:"Stock notifications",active:"Active",description:"Description",save:"Save",operation:"Operation",
      quantity:"Quantity",newStock:"New stock",from:"From",to:"To",direction:"Direction",adjustmentMethod:"Adjustment method",deltaAdjustment:"Change by quantity",absoluteAdjustment:"Set absolute stock",add:"Add",remove:"Remove",reason:"Reason",note:"Note",saveMovement:"Save movement",
      locationDescription:"Description",addLocation:"Add location",disable:"Disable",enable:"Enable",settingsTitle:"Inventory notifications",
      enableNotifications:"Enable notifications",inApp:"In-app notifications",push:"Push notifications",notifyManagers:"Notify inventory managers",
      notifyRestored:"Notify when stock is restored",repeatHours:"Repeat active alert after hours (0 = never)",recipients:"Additional recipients",
      saveSettings:"Save settings",qrTitle:"Item QR code",newQr:"Create new code",downloadQr:"Download QR",copyCode:"Copy code",scanTitle:"Scan item",
      scanHelp:"Scan with the Android app or paste the item code.",openItem:"Open item",saved:"Saved.",copied:"Copied.",loading:"Loading...",
      failed:"Operation failed.",created:"Item created.",movementSaved:"Movement saved.",locationSaved:"Location saved.",invalidCode:"Invalid inventory QR code.",
      browserCamera:"Point the camera at the item QR code.",cameraUnavailable:"Camera QR scanning is not supported here. Paste the code instead.",
      rotateQr:"Generating a new code invalidates the previous one. Continue?",movementReverse:"Opposite movement",reverseTitle:"Opposite movement",confirmReverse:"Create opposite movement",historyHelp:"An opposite movement keeps the original record and adds a corrective entry with the reversed effect.",
      unknownUser:"Unknown user",allLocations:"All locations",location:"Location",available:"Available",threshold:"Threshold",count:"items",countOne:"item",
      all:"All",emptyStock:"Out of stock",showAllLocations:"Show all locations",showTrackedOnly:"Show relevant locations",searchMovements:"Search movements",
      allOperations:"All operations",allTime:"All time",last7:"Last 7 days",last30:"Last 30 days",last90:"Last 90 days",chooseOperation:"Choose operation",
      chooseLocation:"Choose a location",movementSummary:"Movement summary",correctMovement:"Correct",noFilteredMovements:"No movements match these filters."
    },
    bg: {
      title:"Склад",subtitle:"Наличности и движения",back:"Назад",search:"Търси по име, код или категория",scan:"Сканирай QR",newItem:"Нов артикул",
      locations:"Локации",notifications:"Известия",items:"Артикули",totalQuantity:"Общо количество",lowStock:"Намалена наличност",critical:"Критична",catalog:"Каталог",
      selectItem:"Изберете артикул.",noItems:"Няма съвпадащи артикули.",inactive:"Неактивен",normal:"Нормално",low:"Намалено",stockByLocation:"Наличност по локации",
      movements:"Последни движения",movementTitle:"Движение на наличност",noMovements:"Няма движения за този артикул.",edit:"Редакция",itemQr:"QR на артикула",receive:"Приемане",issue:"Изписване",transfer:"Преместване",
      adjustment:"Корекция",newItemTitle:"Нов артикул",editItemTitle:"Редакция на артикул",close:"Затвори",sku:"SKU / код",name:"Име",category:"Категория",unit:"Мярка",
      lowThreshold:"Праг за намалена наличност",criticalThreshold:"Критичен праг",restockTarget:"Целева наличност",initialLocation:"Начална локация",
      initialQuantity:"Начално количество",stockNotifications:"Известия за наличност",active:"Активен",description:"Описание",save:"Запази",operation:"Операция",
      quantity:"Количество",newStock:"Нова наличност",from:"От",to:"Към",direction:"Посока",adjustmentMethod:"Начин на корекция",deltaAdjustment:"Промяна с количество",absoluteAdjustment:"Задай абсолютна наличност",add:"Добавяне",remove:"Намаляване",reason:"Причина",note:"Бележка",saveMovement:"Запази движението",
      locationDescription:"Описание",addLocation:"Добави локация",disable:"Изключи",enable:"Включи",settingsTitle:"Известия за склада",
      enableNotifications:"Включи известията",inApp:"Известия в приложението",push:"Push известия",notifyManagers:"Извести отговорниците за склада",
      notifyRestored:"Извести при възстановена наличност",repeatHours:"Повтори активния сигнал след часове (0 = никога)",recipients:"Допълнителни получатели",
      saveSettings:"Запази настройките",qrTitle:"QR код на артикула",newQr:"Създай нов код",downloadQr:"Изтегли QR",copyCode:"Копирай кода",scanTitle:"Сканирай артикул",
      scanHelp:"Сканирайте с Android приложението или поставете кода на артикула.",openItem:"Отвори артикула",saved:"Запазено.",copied:"Копирано.",loading:"Зареждане...",
      failed:"Операцията не бе успешна.",created:"Артикулът е създаден.",movementSaved:"Движението е записано.",locationSaved:"Локацията е записана.",invalidCode:"Невалиден QR код за артикул.",
      browserCamera:"Насочете камерата към QR кода на артикула.",cameraUnavailable:"QR сканирането с камера не се поддържа тук. Поставете кода ръчно.",
      rotateQr:"Новият код ще направи стария невалиден. Да продължа ли?",movementReverse:"Обратно движение",reverseTitle:"Обратно движение",confirmReverse:"Създай обратно движение",historyHelp:"Обратното движение не изтрива оригиналния запис, а добавя корекция с противоположен ефект.",
      unknownUser:"Неизвестен потребител",allLocations:"Всички локации",location:"Локация",available:"Налично",threshold:"Праг",count:"артикула",countOne:"артикул"
    }
  };
  Object.assign(I18N.bg, {
    all:"\u0412\u0441\u0438\u0447\u043a\u0438",emptyStock:"\u0411\u0435\u0437 \u043d\u0430\u043b\u0438\u0447\u043d\u043e\u0441\u0442",showAllLocations:"\u041f\u043e\u043a\u0430\u0436\u0438 \u0432\u0441\u0438\u0447\u043a\u0438 \u043b\u043e\u043a\u0430\u0446\u0438\u0438",showTrackedOnly:"\u041f\u043e\u043a\u0430\u0436\u0438 \u0432\u0430\u0436\u043d\u0438\u0442\u0435 \u043b\u043e\u043a\u0430\u0446\u0438\u0438",
    searchMovements:"\u0422\u044a\u0440\u0441\u0438 \u0432 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f\u0442\u0430",allOperations:"\u0412\u0441\u0438\u0447\u043a\u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u0438",allTime:"\u0417\u0430 \u0446\u0435\u043b\u0438\u044f \u043f\u0435\u0440\u0438\u043e\u0434",last7:"\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0442\u0435 7 \u0434\u043d\u0438",last30:"\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0442\u0435 30 \u0434\u043d\u0438",last90:"\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0442\u0435 90 \u0434\u043d\u0438",
    chooseOperation:"\u0418\u0437\u0431\u0435\u0440\u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u044f",chooseLocation:"\u0418\u0437\u0431\u0435\u0440\u0438 \u043b\u043e\u043a\u0446\u0438\u044f",movementSummary:"\u0420\u0435\u0437\u044e\u043c\u0435 \u043d\u0430 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435\u0442\u043e",correctMovement:"\u041a\u043e\u0440\u0438\u0433\u0438\u0440\u0430\u0439",noFilteredMovements:"\u041d\u044f\u043c\u0430 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f, \u043a\u043e\u0438\u0442\u043e \u043e\u0442\u0433\u043e\u0432\u0430\u0440\u044f\u0442 \u043d\u0430 \u0444\u0438\u043b\u0442\u0440\u0438\u0442\u0435."
  });
  Object.assign(I18N.en, { reverseTitle:"Correct movement",confirmReverse:"Create correction",historyHelp:"A correction keeps the original movement and adds an entry with the opposite effect." });
  Object.assign(I18N.bg, { reverseTitle:"\u041a\u043e\u0440\u0438\u0433\u0438\u0440\u0430\u043d\u0435 \u043d\u0430 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435",confirmReverse:"\u0421\u044a\u0437\u0434\u0430\u0439 \u043a\u043e\u0440\u0435\u043a\u0446\u0438\u044f",historyHelp:"\u041a\u043e\u0440\u0435\u043a\u0446\u0438\u044f\u0442\u0430 \u0437\u0430\u043f\u0430\u0437\u0432\u0430 \u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u043d\u043e\u0442\u043e \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u0438 \u0434\u043e\u0431\u0430\u0432\u044f \u0437\u0430\u043f\u0438\u0441 \u0441 \u043e\u0431\u0440\u0430\u0442\u0435\u043d \u0435\u0444\u0435\u043a\u0442." });
  const t = (key) => I18N[state.lang][key] || I18N.en[key] || key;
  const locale = () => state.lang === "bg" ? "bg-BG" : "en-GB";
  const fmt = (value) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 4 }).format(Number(value || 0));
  const show = (node, visible) => node && node.classList.toggle("hidden", !visible);
  const setStatus = (message, error) => { el.pageStatus.textContent = String(message || ""); el.pageStatus.style.color = error ? "var(--danger)" : ""; };
  const setMovementStatus = (message, error) => { el.movementStatus.textContent = String(message || ""); el.movementStatus.style.color = error ? "var(--danger)" : ""; };
  const displayName = (user) => String(user && (user.nickname || user.username) || t("unknownUser"));
  const selectedItem = () => state.items.find((item) => item.id === state.selectedItemId) || null;
  const activeLocations = () => state.locations.filter((location) => location.active);

  async function refreshAccessToken() {
    const response = await fetch("/api/auth/refresh", { method:"POST", credentials:"include" });
    if (!response.ok) return null;
    const body = await response.json().catch(() => ({}));
    if (!body.accessToken) return null;
    localStorage.setItem(ACCESS_KEY, body.accessToken);
    return body.accessToken;
  }
  async function api(path, options) {
    const opts = options || {};
    let token = localStorage.getItem(ACCESS_KEY);
    if (!token) { window.location.href = "/login"; throw new Error("Not logged in"); }
    const run = (bearer) => fetch(path, { ...opts, credentials:"include", headers:{ "content-type":"application/json", ...(opts.headers || {}), authorization:`Bearer ${bearer}` } });
    let response = await run(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (!token) { window.location.href = "/login"; throw new Error("Session expired"); }
      response = await run(token);
    }
    return response;
  }
  async function bodyOrError(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fieldErrors = body.error && typeof body.error === "object" ? body.error.fieldErrors : null;
      const fieldMessages = fieldErrors && typeof fieldErrors === "object" ? Object.values(fieldErrors).flat().filter(Boolean).map(String) : [];
      const formMessages = body.error && typeof body.error === "object" && Array.isArray(body.error.formErrors) ? body.error.formErrors.map(String) : [];
      const message = typeof body.error === "string" ? body.error : [...formMessages, ...fieldMessages].join(" ") || t("failed");
      throw new Error(message);
    }
    return body;
  }
  function openModal(node) { show(node, true); node.setAttribute("aria-hidden", "false"); }
  function closeModal(node) { show(node, false); node.setAttribute("aria-hidden", "true"); if (node === el.scanModal) stopCamera(); }

  function translatePage() {
    const labels = {
      pageTitle:"title",pageSubtitle:"subtitle",backBtn:"back",scanBtn:"scan",newItemBtn:"newItem",locationsBtn:"locations",settingsBtn:"notifications",
      itemsMetricLabel:"items",unitsMetricLabel:"totalQuantity",lowMetricLabel:"lowStock",criticalMetricLabel:"critical",catalogTitle:"catalog",
      skuLabel:"sku",nameLabel:"name",categoryLabel:"category",unitLabel:"unit",lowLabel:"lowThreshold",criticalLabel:"criticalThreshold",
      restockLabel:"restockTarget",initialLocationLabel:"initialLocation",initialQuantityLabel:"initialQuantity",itemNotificationsLabel:"stockNotifications",
      activeLabel:"active",descriptionLabel:"description",saveItemBtn:"save",movementTitle:"movementTitle",movementTypeLabel:"operation",quantityLabel:"quantity",
      sourceLabel:"from",destinationLabel:"to",directionLabel:"direction",adjustmentModeLabel:"adjustmentMethod",reasonLabel:"reason",noteLabel:"note",saveMovementBtn:"saveMovement",
      locationsTitle:"locations",locationNameLabel:"name",locationDescriptionLabel:"locationDescription",addLocationBtn:"addLocation",settingsTitle:"settingsTitle",
      notificationsEnabledLabel:"enableNotifications",inAppEnabledLabel:"inApp",pushEnabledLabel:"push",notifyManagersLabel:"notifyManagers",
      notifyOnRestoredLabel:"notifyRestored",repeatHoursLabel:"repeatHours",recipientsLabel:"recipients",saveSettingsBtn:"saveSettings",
      qrTitle:"qrTitle",newQrBtn:"newQr",downloadQrBtn:"downloadQr",copyQrBtn:"copyCode",scanTitle:"scanTitle",scanHelp:"scanHelp",submitScanBtn:"openItem",
      historyTitle:"movements",historyHelp:"historyHelp",scanActionTitle:"chooseOperation",scanReceiveBtn:"receive",scanIssueBtn:"issue",scanTransferBtn:"transfer",
      reverseTitle:"reverseTitle",reverseReasonLabel:"reason",saveReverseBtn:"confirmReverse"
    };
    Object.entries(labels).forEach(([id,key]) => { if (el[id]) el[id].textContent = t(key); });
    if(state.qrItem)el.qrItemCode.textContent=`${t("sku")}: ${state.qrItem.sku}`;
    document.querySelectorAll("[data-close]").forEach((button) => { button.textContent = t("close"); });
    el.searchInput.placeholder = t("search");
    el.langBtn.textContent = state.lang === "bg" ? "EN" : "BG";
    el.movementType.options[0].textContent = t("receive"); el.movementType.options[1].textContent = t("issue");
    el.movementType.options[2].textContent = t("transfer"); el.movementType.options[3].textContent = t("adjustment");
    el.movementDirection.options[0].textContent = t("add"); el.movementDirection.options[1].textContent = t("remove");
    el.adjustmentMode.options[0].textContent = t("deltaAdjustment"); el.adjustmentMode.options[1].textContent = t("absoluteAdjustment");
    const catalogLabels = { all:"all", low:"low", critical:"critical", empty:"emptyStock" };
    el.catalogFilters.querySelectorAll("[data-catalog-filter]").forEach((button) => { button.textContent = t(catalogLabels[button.dataset.catalogFilter]); });
    el.historySearch.placeholder = t("searchMovements");
    ["allOperations","receive","issue","transfer","adjustment"].forEach((key,index) => { el.historyTypeFilter.options[index].textContent = t(key); });
    ["allTime","last7","last30","last90"].forEach((key,index) => { el.historyPeriodFilter.options[index].textContent = t(key); });
    fillHistoryLocationFilter();
    renderAll();
  }

  function overallStatus(item) {
    const balance = Number(item.totalBalance || 0);
    if (item.criticalStockThreshold != null && balance <= Number(item.criticalStockThreshold)) return "critical";
    if (item.lowStockThreshold != null && balance <= Number(item.lowStockThreshold)) return "low";
    return "normal";
  }
  function makeBadge(status) {
    const badge = document.createElement("span"); badge.className = `badge ${status}`; badge.textContent = t(status); return badge;
  }
  function renderSummary() {
    const active = state.items.filter((item) => item.active);
    el.itemsMetric.textContent = String(active.length);
    el.unitsMetric.textContent = fmt(active.reduce((sum,item) => sum + Number(item.totalBalance || 0), 0));
    el.lowMetric.textContent = String(active.filter((item) => overallStatus(item) === "low").length);
    el.criticalMetric.textContent = String(active.filter((item) => overallStatus(item) === "critical").length);
  }
  function filteredItems() {
    const query = el.searchInput.value.trim().toLocaleLowerCase(locale());
    return state.items.filter((item) => {
      const matchesQuery = !query || [item.name,item.sku,item.category].some((value) => String(value || "").toLocaleLowerCase(locale()).includes(query));
      const status = overallStatus(item);
      const matchesFilter = state.catalogFilter === "all"
        || (state.catalogFilter === "empty" && Number(item.totalBalance || 0) <= 0)
        || state.catalogFilter === status;
      return matchesQuery && matchesFilter;
    });
  }
  async function refreshCatalogView(){const items=filteredItems();if(!items.some((item)=>item.id===state.selectedItemId)){state.selectedItemId=items[0]?.id||"";state.showAllLocations=false;await loadMovements();}renderItems();renderDetail();}
  function renderItems() {
    const items = filteredItems(); el.itemList.replaceChildren(); el.itemCount.textContent = `${items.length} ${t(items.length === 1 ? "countOne" : "count")}`;
    el.catalogFilters.querySelectorAll("[data-catalog-filter]").forEach((button) => button.classList.toggle("active", button.dataset.catalogFilter === state.catalogFilter));
    if (!items.length) { const empty=document.createElement("div"); empty.className="empty"; empty.textContent=t("noItems"); el.itemList.append(empty); return; }
    items.forEach((item) => {
      const button=document.createElement("button"); button.type="button"; button.className=`item${item.id===state.selectedItemId?" selected":""}`;
      const top=document.createElement("div"); top.className="item-title"; const name=document.createElement("span"); name.textContent=item.name; const status=document.createElement("span");status.className="item-status";status.append(makeBadge(overallStatus(item)));top.append(name,status);
      const quantity=document.createElement("div");quantity.className="item-quantity";quantity.textContent=`${fmt(item.totalBalance)} ${item.unit}`;
      const meta=document.createElement("div"); meta.className="item-meta"; meta.textContent=`${item.sku}${item.category?` | ${item.category}`:""}${item.active?"":` | ${t("inactive")}`}`;
      button.append(top,quantity,meta); button.addEventListener("click",()=>selectItem(item.id)); el.itemList.append(button);
    });
  }
  function addAction(container, label, handler, primary) {
    const button=document.createElement("button"); button.type="button"; button.className=`btn${primary?" primary":""}`; button.textContent=label; button.addEventListener("click",handler); container.append(button);
  }
  function movementLabel(movement) {
    if (movement.type === "receive") return `${t("receive")} -> ${movement.destinationLocation?.name || "-"}`;
    if (movement.type === "issue") return `${t("issue")} <- ${movement.sourceLocation?.name || "-"}`;
    if (movement.type === "transfer") return `${movement.sourceLocation?.name || "-"} -> ${movement.destinationLocation?.name || "-"}`;
    return `${t("adjustment")} ${movement.destinationLocation ? "+" : "-"}`;
  }
  function fillHistoryLocationFilter() {
    const current=el.historyLocationFilter.value;el.historyLocationFilter.replaceChildren();const all=document.createElement("option");all.value="all";all.textContent=t("allLocations");el.historyLocationFilter.append(all);
    state.locations.forEach((location)=>{const option=document.createElement("option");option.value=location.id;option.textContent=location.name;el.historyLocationFilter.append(option);});
    el.historyLocationFilter.value=Array.from(el.historyLocationFilter.options).some((option)=>option.value===current)?current:"all";
  }
  function renderDetail() {
    const item=selectedItem(); show(el.detailEmpty,!item); show(el.detailContent,Boolean(item)); if(!item){el.detailEmpty.textContent=t("selectItem");return;}
    el.detailContent.replaceChildren();
    const head=document.createElement("div"); head.className="detail-head"; const info=document.createElement("div"); const title=document.createElement("h2"); title.textContent=item.name;
    const sku=document.createElement("div"); sku.className="sku"; sku.textContent=`${item.sku}${item.category?` | ${item.category}`:""}`; const description=document.createElement("p"); description.className="muted"; description.style.marginTop="7px"; description.textContent=item.description || ""; info.append(title,sku,description);
    const actions=document.createElement("div"); actions.className="detail-actions";
    if(state.abilities.receive)addAction(actions,t("receive"),()=>openMovement("receive"),true);
    if(state.abilities.issue)addAction(actions,t("issue"),()=>openMovement("issue"));
    if(state.abilities.transfer)addAction(actions,t("transfer"),()=>openMovement("transfer"));
    if(state.abilities.count)addAction(actions,t("adjustment"),()=>openMovement("adjustment"));
    if(state.abilities.manageItems){addAction(actions,t("edit"),openEditItem);addAction(actions,t("itemQr"),openCurrentQr);}
    head.append(info,actions); el.detailContent.append(head);
    const stockToolbar=document.createElement("div");stockToolbar.className="stock-toolbar";const stockTitle=document.createElement("h3");stockTitle.textContent=t("stockByLocation");const toggleLocations=document.createElement("button");toggleLocations.type="button";toggleLocations.className="btn";toggleLocations.textContent=t(state.showAllLocations?"showTrackedOnly":"showAllLocations");toggleLocations.addEventListener("click",()=>{state.showAllLocations=!state.showAllLocations;renderDetail();});stockToolbar.append(stockTitle,toggleLocations);el.detailContent.append(stockToolbar);
    const grid=document.createElement("div"); grid.className="stock-grid";
    (item.stockByLocation || []).filter((row)=>state.showAllLocations?(row.locationActive||row.balance!==0):((row.tracked&&row.locationActive)||row.balance!==0)).forEach((row)=>{
      const card=document.createElement("div"); card.className="stock"; const top=document.createElement("div"); top.className="stock-head"; const label=document.createElement("strong"); label.textContent=row.locationName;top.append(label);if(row.tracked||row.balance!==0)top.append(makeBadge(row.status));
      const value=document.createElement("div"); value.className="stock-value"; value.textContent=`${fmt(row.balance)} ${item.unit}`; const threshold=document.createElement("div"); threshold.className="muted"; threshold.textContent=`${t("lowStock")}: ${row.low==null?"-":fmt(row.low)} | ${t("critical")}: ${row.critical==null?"-":fmt(row.critical)}`; card.append(top,value,threshold); grid.append(card);
    });
    if(!grid.children.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=t("showAllLocations");grid.append(empty);} el.detailContent.append(grid);
    const historyActions=document.createElement("div");historyActions.className="row";historyActions.style.cssText="justify-content:flex-end;margin-top:14px";addAction(historyActions,`${t("movements")} (${state.movements.length})`,()=>{renderHistory();openModal(el.historyModal);});el.detailContent.append(historyActions);
  }
  function renderHistory() {
    const item=selectedItem();el.historyList.replaceChildren();if(!item)return;
    const query=el.historySearch.value.trim().toLocaleLowerCase(locale());const type=el.historyTypeFilter.value;const locationId=el.historyLocationFilter.value;const days=el.historyPeriodFilter.value==="all"?0:Number(el.historyPeriodFilter.value);const after=days?Date.now()-days*86400000:0;
    const movements=state.movements.filter((movement)=>{
      const matchesType=type==="all"||movement.type===type;const matchesLocation=locationId==="all"||movement.sourceLocationId===locationId||movement.destinationLocationId===locationId;const matchesPeriod=!after||new Date(movement.createdAt).getTime()>=after;
      const haystack=[movementLabel(movement),movement.reason,movement.note,displayName(movement.createdBy)].join(" ").toLocaleLowerCase(locale());return matchesType&&matchesLocation&&matchesPeriod&&(!query||haystack.includes(query));
    });
    if(!movements.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=state.movements.length?t("noFilteredMovements"):t("noMovements");el.historyList.append(empty);}
    movements.forEach((movement)=>{
      const row=document.createElement("div");row.className="movement";const main=document.createElement("div");const title=document.createElement("strong");const outgoing=Boolean(movement.sourceLocationId&&!movement.destinationLocationId);const transfer=Boolean(movement.sourceLocationId&&movement.destinationLocationId);title.className=transfer?"transfer":outgoing?"out":"in";title.textContent=`${outgoing?"-":transfer?"":"+"}${fmt(movement.quantity)} ${item.unit} | ${movementLabel(movement)}`;
      const meta=document.createElement("div");meta.className="muted";const parts=[new Date(movement.createdAt).toLocaleString(locale()),displayName(movement.createdBy)];if(movement.reason)parts.push(movement.reason);if(movement.note)parts.push(movement.note);meta.textContent=parts.join(" | ");main.append(title,meta);row.append(main);
      if(state.abilities.count&&!movement.reversesMovementId&&!(movement.reversedBy||[]).length){const reverse=document.createElement("button");reverse.type="button";reverse.className="btn";reverse.textContent=t("correctMovement");reverse.addEventListener("click",()=>openReverseMovement(movement.id));row.append(reverse);}el.historyList.append(row);
    });
  }
  function renderLocations() {
    el.locationList.replaceChildren(); state.locations.forEach((location)=>{const row=document.createElement("div");row.className="location-row";const text=document.createElement("div");const strong=document.createElement("strong");strong.textContent=location.name;const meta=document.createElement("div");meta.className="muted";meta.textContent=location.description||"";text.append(strong,meta);const button=document.createElement("button");button.type="button";button.className="btn";button.textContent=location.active?t("disable"):t("enable");button.addEventListener("click",()=>toggleLocation(location));row.append(text,button);el.locationList.append(row);});
  }
  function renderRecipients() {
    el.recipientList.replaceChildren(); const selected=new Set((state.settings&&state.settings.recipientUserIds)||[]); state.users.forEach((user)=>{const label=document.createElement("label");label.className="check";const input=document.createElement("input");input.type="checkbox";input.value=user.id;input.checked=selected.has(user.id);const span=document.createElement("span");span.textContent=displayName(user);label.append(input,span);el.recipientList.append(label);});
  }
  function renderPermissions() {
    show(el.newItemBtn,state.abilities.manageItems);show(el.locationsBtn,state.abilities.manageItems);show(el.settingsBtn,state.abilities.manageSettings);
  }
  function renderAll(){renderPermissions();renderSummary();renderItems();renderDetail();fillHistoryLocationFilter();renderHistory();renderLocations();renderRecipients();}

  function fillLocationSelect(select, blank) { const current=select.value;select.replaceChildren();if(blank){const option=document.createElement("option");option.value="";option.textContent="-";select.append(option);}activeLocations().forEach((location)=>{const option=document.createElement("option");option.value=location.id;option.textContent=location.name;select.append(option);});if(Array.from(select.options).some((option)=>option.value===current))select.value=current; }
  async function loadBootstrap(preferredItemId) {
    setStatus(t("loading")); const body=await bodyOrError(await api("/api/inventory/bootstrap")); state.items=body.items||[];state.locations=body.locations||[];state.users=body.users||[];state.settings=body.settings||null;state.abilities=body.abilities||{};
    if(preferredItemId&&state.items.some((item)=>item.id===preferredItemId))state.selectedItemId=preferredItemId;else if(!state.items.some((item)=>item.id===state.selectedItemId))state.selectedItemId=state.items[0]?.id||"";
    const visibleItems=filteredItems();if(!visibleItems.some((item)=>item.id===state.selectedItemId))state.selectedItemId=visibleItems[0]?.id||"";
    fillLocationSelect(el.itemInitialLocation,true);fillLocationSelect(el.movementSource,true);fillLocationSelect(el.movementDestination,true);await loadMovements();renderAll();setStatus("");
  }
  async function loadMovements(){const item=selectedItem();if(!item){state.movements=[];return;}const body=await bodyOrError(await api(`/api/inventory/movements?itemId=${encodeURIComponent(item.id)}&limit=50`));state.movements=body.items||[];}
  async function selectItem(id){state.selectedItemId=id;state.showAllLocations=false;await loadMovements();renderItems();renderDetail();}

  function nullableNumber(input){return input.value.trim()===""?null:Number(input.value);}
  function openNewItem(){state.editingItemId="";el.itemForm.reset();el.itemUnit.value="pcs";el.itemNotifications.checked=true;el.itemActive.checked=true;el.itemModalTitle.textContent=t("newItemTitle");show(el.initialLocationWrap,true);show(el.initialQuantityWrap,true);show(el.activeWrap,false);fillLocationSelect(el.itemInitialLocation,true);openModal(el.itemModal);}
  function openEditItem(){const item=selectedItem();if(!item)return;state.editingItemId=item.id;el.itemModalTitle.textContent=t("editItemTitle");el.itemSku.value=item.sku;el.itemName.value=item.name;el.itemCategory.value=item.category||"";el.itemUnit.value=item.unit;el.itemLow.value=item.lowStockThreshold??"";el.itemCritical.value=item.criticalStockThreshold??"";el.itemRestock.value=item.restockTarget??"";el.itemNotifications.checked=Boolean(item.notificationsEnabled);el.itemActive.checked=Boolean(item.active);el.itemDescription.value=item.description||"";show(el.initialLocationWrap,false);show(el.initialQuantityWrap,false);show(el.activeWrap,true);openModal(el.itemModal);}
  async function saveItem(event){event.preventDefault();const payload={sku:el.itemSku.value,name:el.itemName.value,category:el.itemCategory.value,unit:el.itemUnit.value,lowStockThreshold:nullableNumber(el.itemLow),criticalStockThreshold:nullableNumber(el.itemCritical),restockTarget:nullableNumber(el.itemRestock),notificationsEnabled:el.itemNotifications.checked,description:el.itemDescription.value};
    try{let body;if(state.editingItemId){payload.active=el.itemActive.checked;body=await bodyOrError(await api(`/api/inventory/items/${encodeURIComponent(state.editingItemId)}`,{method:"PATCH",body:JSON.stringify(payload)}));}else{payload.initialLocationId=el.itemInitialLocation.value||undefined;payload.initialQuantity=Number(el.itemInitialQuantity.value||0);body=await bodyOrError(await api("/api/inventory/items",{method:"POST",body:JSON.stringify(payload)}));}const id=body.item?.id||state.editingItemId;closeModal(el.itemModal);await loadBootstrap(id);setStatus(state.editingItemId?t("saved"):t("created"));if(body.qrPayload)showQr(body.qrPayload,body.qrDataUrl,body.item);}catch(error){setStatus(error.message,true);}}

  function stockRow(locationId){return (selectedItem()?.stockByLocation||[]).find((row)=>row.locationId===locationId)||null;}
  function locationName(locationId){return state.locations.find((location)=>location.id===locationId)?.name||t("chooseLocation");}
  function movementRequirements(){const type=el.movementType.value;const direction=el.movementDirection.value;const absolute=type==="adjustment"&&el.adjustmentMode.value==="absolute";return {type,direction,absolute,needsSource:type==="issue"||type==="transfer"||(type==="adjustment"&&!absolute&&direction==="out"),needsDestination:type==="receive"||type==="transfer"||(type==="adjustment"&&((!absolute&&direction==="in")||absolute))};}
  function fillMovementSelect(select, sourceSelect, excludedId){const item=selectedItem();const current=select.value;select.replaceChildren();const blank=document.createElement("option");blank.value="";blank.textContent="-";select.append(blank);activeLocations().forEach((location)=>{const row=stockRow(location.id);const balance=Number(row?.balance||0);const option=document.createElement("option");option.value=location.id;option.textContent=`${location.name} (${fmt(balance)} ${item?.unit||""})`;option.disabled=Boolean((sourceSelect&&balance<=0)||(excludedId&&location.id===excludedId));select.append(option);});const matching=Array.from(select.options).find((option)=>option.value===current&&!option.disabled);select.value=matching?current:"";}
  function refreshMovementLocationOptions(){const source=el.movementSource.value;const destination=el.movementDestination.value;fillMovementSelect(el.movementSource,true,"");const selectedSource=el.movementSource.value||source;if(selectedSource&&Array.from(el.movementSource.options).some((option)=>option.value===selectedSource&&!option.disabled))el.movementSource.value=selectedSource;fillMovementSelect(el.movementDestination,false,el.movementSource.value);if(destination&&Array.from(el.movementDestination.options).some((option)=>option.value===destination&&!option.disabled))el.movementDestination.value=destination;}
  function updateMovementSummary(){const item=selectedItem();if(!item)return;const {type,direction,absolute,needsSource}=movementRequirements();const quantity=el.movementQuantity.value.trim();const source=el.movementSource.value;const destination=el.movementDestination.value;const sourceBalance=Number(stockRow(source)?.balance||0);el.movementAvailability.textContent=needsSource&&source?`${t("available")}: ${fmt(sourceBalance)} ${item.unit}`:"";el.movementQuantity.max=needsSource&&!absolute&&source?String(Math.max(0,sourceBalance)):"";if(!quantity){el.movementSummary.textContent=t("movementSummary");return;}const amount=`${fmt(quantity)} ${item.unit}`;if(type==="receive")el.movementSummary.textContent=`${t("receive")}: ${amount} -> ${locationName(destination)}`;else if(type==="issue")el.movementSummary.textContent=`${t("issue")}: ${amount} <- ${locationName(source)}`;else if(type==="transfer")el.movementSummary.textContent=`${t("transfer")}: ${amount} | ${locationName(source)} -> ${locationName(destination)}`;else if(absolute)el.movementSummary.textContent=`${t("adjustment")}: ${locationName(destination)} = ${amount}`;else el.movementSummary.textContent=`${t("adjustment")}: ${direction==="out"?"-":"+"}${amount} | ${locationName(direction==="out"?source:destination)}`;}
  function applyMovementDefaults(){const item=selectedItem();if(!item)return;const {type,absolute,needsSource,needsDestination}=movementRequirements();const positive=(item.stockByLocation||[]).filter((row)=>row.locationActive&&Number(row.balance)>0);const tracked=(item.stockByLocation||[]).filter((row)=>row.locationActive&&row.tracked);if(needsSource&&positive.length===1)el.movementSource.value=positive[0].locationId;if(needsDestination&&(type==="receive"||absolute)){if(tracked.length===1)el.movementDestination.value=tracked[0].locationId;else if(!tracked.length&&activeLocations().length===1)el.movementDestination.value=activeLocations()[0].id;}refreshMovementLocationOptions();updateMovementSummary();}
  function openMovement(type){const item=selectedItem();if(!item)return;el.movementForm.reset();el.movementType.value=type;el.adjustmentMode.value="delta";setMovementStatus("");updateMovementFields();applyMovementDefaults();openModal(el.movementModal);}
  function updateMovementFields(){const {type,absolute,needsSource,needsDestination}=movementRequirements();show(el.adjustmentModeWrap,type==="adjustment");show(el.directionWrap,type==="adjustment"&&!absolute);show(el.sourceWrap,needsSource);show(el.destinationWrap,needsDestination);el.movementSource.required=needsSource;el.movementDestination.required=needsDestination;el.movementReason.required=type==="adjustment";el.destinationLabel.textContent=absolute?t("location"):t("to");el.quantityLabel.textContent=absolute?t("newStock"):t("quantity");el.movementQuantity.min=absolute?"0":"0.000001";refreshMovementLocationOptions();setMovementStatus("");updateMovementSummary();}
  async function saveMovement(event){event.preventDefault();const item=selectedItem();if(!item)return;const {type,absolute,needsSource}=movementRequirements();const quantity=Number(el.movementQuantity.value);const sourceBalance=Number(stockRow(el.movementSource.value)?.balance||0);if(type==="transfer"&&el.movementSource.value===el.movementDestination.value){setMovementStatus("Different source and destination are required",true);return;}if(needsSource&&!absolute&&quantity>sourceBalance+1e-9){setMovementStatus(`Insufficient stock. ${t("available")}: ${fmt(sourceBalance)} ${item.unit}`,true);return;}const payload={itemId:item.id,type,quantity,sourceLocationId:el.movementSource.value||undefined,destinationLocationId:el.movementDestination.value||undefined,direction:type==="adjustment"&&!absolute?el.movementDirection.value:undefined,adjustmentMode:type==="adjustment"?el.adjustmentMode.value:undefined,locationId:absolute?el.movementDestination.value||undefined:undefined,reason:el.movementReason.value||undefined,note:el.movementNote.value||undefined};el.saveMovementBtn.disabled=true;setMovementStatus(t("loading"));try{await bodyOrError(await api("/api/inventory/movements",{method:"POST",body:JSON.stringify(payload)}));closeModal(el.movementModal);await loadBootstrap(item.id);setStatus(t("movementSaved"));}catch(error){setMovementStatus(error.message,true);}finally{el.saveMovementBtn.disabled=false;}}
  function openReverseMovement(id){state.reverseMovementId=id;el.reverseForm.reset();openModal(el.reverseModal);}
  async function reverseMovement(event){event.preventDefault();if(!state.reverseMovementId)return;try{await bodyOrError(await api(`/api/inventory/movements/${encodeURIComponent(state.reverseMovementId)}/reverse`,{method:"POST",body:JSON.stringify({reason:el.reverseReasonInput.value})}));state.reverseMovementId="";closeModal(el.reverseModal);await loadBootstrap(state.selectedItemId);setStatus(t("movementSaved"));}catch(error){setStatus(error.message,true);}}

  async function saveLocation(event){event.preventDefault();try{await bodyOrError(await api("/api/inventory/locations",{method:"POST",body:JSON.stringify({name:el.locationName.value,description:el.locationDescription.value})}));el.locationForm.reset();await loadBootstrap(state.selectedItemId);setStatus(t("locationSaved"));}catch(error){setStatus(error.message,true);}}
  async function toggleLocation(location){try{await bodyOrError(await api(`/api/inventory/locations/${encodeURIComponent(location.id)}`,{method:"PATCH",body:JSON.stringify({active:!location.active})}));await loadBootstrap(state.selectedItemId);}catch(error){setStatus(error.message,true);}}

  function openSettings(){const s=state.settings||{};el.notificationsEnabled.checked=Boolean(s.notificationsEnabled);el.inAppEnabled.checked=Boolean(s.inAppEnabled);el.pushEnabled.checked=Boolean(s.pushEnabled);el.notifyManagers.checked=Boolean(s.notifyManagers);el.notifyOnRestored.checked=Boolean(s.notifyOnRestored);el.repeatHours.value=Number(s.repeatHours||0);renderRecipients();openModal(el.settingsModal);}
  async function saveSettings(event){event.preventDefault();const recipientUserIds=Array.from(el.recipientList.querySelectorAll("input:checked")).map((input)=>input.value);const payload={notificationsEnabled:el.notificationsEnabled.checked,inAppEnabled:el.inAppEnabled.checked,pushEnabled:el.pushEnabled.checked,notifyManagers:el.notifyManagers.checked,notifyOnRestored:el.notifyOnRestored.checked,repeatHours:Number(el.repeatHours.value||0),recipientUserIds};try{const body=await bodyOrError(await api("/api/inventory/settings",{method:"PUT",body:JSON.stringify(payload)}));state.settings=body.settings;closeModal(el.settingsModal);setStatus(t("saved"));}catch(error){setStatus(error.message,true);}}

  function showQr(payload,dataUrl,item){state.qrPayload=payload;state.qrDataUrl=dataUrl;state.qrItem=item||selectedItem();el.qrPayload.value=payload;el.qrImage.src=dataUrl;el.qrItemCode.textContent=state.qrItem?`${t("sku")}: ${state.qrItem.sku}`:"";openModal(el.qrModal);}
  async function openCurrentQr(){const item=selectedItem();if(!item)return;try{const body=await bodyOrError(await api(`/api/inventory/items/${encodeURIComponent(item.id)}/qr`));showQr(body.qrPayload,body.qrDataUrl,body.item);}catch(error){setStatus(error.message,true);}}
  async function rotateQr(){const item=selectedItem();if(!item||!window.confirm(t("rotateQr")))return;try{const body=await bodyOrError(await api(`/api/inventory/items/${encodeURIComponent(item.id)}/rotate-qr`,{method:"POST",body:"{}"}));showQr(body.qrPayload,body.qrDataUrl,body.item);}catch(error){setStatus(error.message,true);}}
  async function downloadQrLabel(){if(!state.qrDataUrl)return;const item=state.qrItem||selectedItem();const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error(t("failed")));image.src=state.qrDataUrl;});const canvas=document.createElement("canvas");canvas.width=640;canvas.height=735;const context=canvas.getContext("2d");if(!context)throw new Error(t("failed"));context.fillStyle="#ffffff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,40,40,560,560);context.fillStyle="#071017";context.textAlign="center";context.textBaseline="middle";context.font="700 32px Segoe UI, sans-serif";context.fillText(`SKU: ${item?.sku||"-"}`,320,646,560);context.font="24px Segoe UI, sans-serif";context.fillText(item?.name||"",320,690,560);const link=document.createElement("a");link.href=canvas.toDataURL("image/png");link.download=`procal-inventory-${item?.sku||"item"}.png`;document.body.append(link);link.click();link.remove();}
  function parsePayload(value){try{const url=new URL(String(value||"").trim());if(url.protocol!=="procal:"||url.hostname!=="inventory")return null;const itemId=decodeURIComponent(url.pathname.replace(/^\//,""));const token=url.searchParams.get("token")||"";return itemId&&token?{itemId,token}:null;}catch(_){return null;}}
  function showScanActions(){const item=selectedItem();if(!item)return;el.scanActionItem.replaceChildren();const name=document.createElement("strong");name.textContent=item.name;const meta=document.createElement("div");meta.className="muted";meta.textContent=`${item.sku} | ${fmt(item.totalBalance)} ${item.unit}`;el.scanActionItem.append(name,meta);show(el.scanReceiveBtn,state.abilities.receive);show(el.scanIssueBtn,state.abilities.issue);show(el.scanTransferBtn,state.abilities.transfer);openModal(el.scanActionModal);}
  function openScannedMovement(type){closeModal(el.scanActionModal);openMovement(type);}
  async function submitScan(value){const parsed=parsePayload(value);if(!parsed){setStatus(t("invalidCode"),true);return;}try{const body=await bodyOrError(await api("/api/inventory/scan",{method:"POST",body:JSON.stringify(parsed)}));const index=state.items.findIndex((item)=>item.id===body.item.id);if(index>=0)state.items[index]=body.item;else state.items.unshift(body.item);state.selectedItemId=body.item.id;state.showAllLocations=false;closeModal(el.scanModal);await loadMovements();renderAll();setStatus("");showScanActions();}catch(error){setStatus(error.message,true);}}
  async function openScanner(){el.scanPayload.value="";openModal(el.scanModal);if(window.ProCalAndroid&&typeof window.ProCalAndroid.startInventoryQrScan==="function"){window.ProCalAndroid.startInventoryQrScan();return;}await startBrowserCamera();}
  async function startBrowserCamera(){if(!window.BarcodeDetector||!navigator.mediaDevices?.getUserMedia){el.scanHelp.textContent=t("cameraUnavailable");return;}let video=document.getElementById("inventoryScanVideo");if(!video){video=document.createElement("video");video.id="inventoryScanVideo";video.setAttribute("playsinline","");video.style.cssText="width:100%;max-height:340px;border-radius:8px;background:#000";el.scanPayload.before(video);}try{state.mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});video.srcObject=state.mediaStream;await video.play();el.scanHelp.textContent=t("browserCamera");const detector=new BarcodeDetector({formats:["qr_code"]});const scan=async()=>{if(!state.mediaStream)return;try{const codes=await detector.detect(video);if(codes[0]?.rawValue){await submitScan(codes[0].rawValue);return;}}catch(_){}requestAnimationFrame(scan);};requestAnimationFrame(scan);}catch(_){el.scanHelp.textContent=t("cameraUnavailable");}}
  function stopCamera(){if(state.mediaStream){state.mediaStream.getTracks().forEach((track)=>track.stop());state.mediaStream=null;}const video=document.getElementById("inventoryScanVideo");if(video)video.remove();el.scanHelp.textContent=t("scanHelp");}

  el.langBtn.addEventListener("click",()=>{state.lang=state.lang==="bg"?"en":"bg";localStorage.setItem("procal_lang",state.lang);translatePage();});
  el.searchInput.addEventListener("input",()=>refreshCatalogView().catch((error)=>setStatus(error.message,true)));el.catalogFilters.querySelectorAll("[data-catalog-filter]").forEach((button)=>button.addEventListener("click",()=>{state.catalogFilter=button.dataset.catalogFilter;refreshCatalogView().catch((error)=>setStatus(error.message,true));}));el.newItemBtn.addEventListener("click",openNewItem);el.locationsBtn.addEventListener("click",()=>{renderLocations();openModal(el.locationsModal);});el.settingsBtn.addEventListener("click",openSettings);el.scanBtn.addEventListener("click",openScanner);
  el.itemForm.addEventListener("submit",saveItem);el.movementForm.addEventListener("submit",saveMovement);el.movementType.addEventListener("change",updateMovementFields);el.movementDirection.addEventListener("change",updateMovementFields);el.adjustmentMode.addEventListener("change",updateMovementFields);el.movementSource.addEventListener("change",()=>{refreshMovementLocationOptions();setMovementStatus("");updateMovementSummary();});el.movementDestination.addEventListener("change",()=>{setMovementStatus("");updateMovementSummary();});el.movementQuantity.addEventListener("input",()=>{setMovementStatus("");updateMovementSummary();});el.reverseForm.addEventListener("submit",reverseMovement);el.locationForm.addEventListener("submit",saveLocation);el.settingsForm.addEventListener("submit",saveSettings);
  el.historySearch.addEventListener("input",renderHistory);el.historyTypeFilter.addEventListener("change",renderHistory);el.historyLocationFilter.addEventListener("change",renderHistory);el.historyPeriodFilter.addEventListener("change",renderHistory);
  el.scanReceiveBtn.addEventListener("click",()=>openScannedMovement("receive"));el.scanIssueBtn.addEventListener("click",()=>openScannedMovement("issue"));el.scanTransferBtn.addEventListener("click",()=>openScannedMovement("transfer"));
  el.submitScanBtn.addEventListener("click",()=>submitScan(el.scanPayload.value));el.newQrBtn.addEventListener("click",rotateQr);el.copyQrBtn.addEventListener("click",async()=>{await navigator.clipboard.writeText(state.qrPayload);setStatus(t("copied"));});el.downloadQrBtn.addEventListener("click",()=>downloadQrLabel().catch((error)=>setStatus(error.message,true)));
  document.querySelectorAll("[data-close]").forEach((button)=>button.addEventListener("click",()=>closeModal(document.getElementById(button.dataset.close))));
  document.querySelectorAll(".modal").forEach((modal)=>modal.addEventListener("click",(event)=>{if(event.target===modal)closeModal(modal);}));
  window.addEventListener("procal-inventory-qr-scan",(event)=>{const value=event.detail?.payload||event.detail?.value||event.detail||"";submitScan(value);});
  window.addEventListener("procal-qr-error",(event)=>setStatus(String(event.detail?.message||t("failed")),true));

  translatePage();
  loadBootstrap().catch((error)=>setStatus(error.message,true));
})();
