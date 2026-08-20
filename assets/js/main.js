(function () {
  "use strict";

  var forms = document.querySelectorAll("[data-signup-form]");

  forms.forEach(function (form) {
    var statusEl = form.querySelector("[data-form-status]");
    var submitBtn = form.querySelector("[data-submit-btn]");
    var honeypot = form.querySelector('input[name="botcheck"]');

    var msgSuccess = form.getAttribute("data-msg-success");
    var msgError = form.getAttribute("data-msg-error");
    var msgSending = form.getAttribute("data-msg-sending");
    var labelDefault = submitBtn ? submitBtn.textContent : "";

    function setStatus(text, kind) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.remove("is-success", "is-error");
      if (kind) statusEl.classList.add(kind);
      statusEl.classList.toggle("is-visible", !!text);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (honeypot && honeypot.checked) {
        return; // bot trap tripped, silently drop
      }

      var accessKeyInput = form.querySelector('input[name="access_key"]');
      if (!accessKeyInput || !accessKeyInput.value || accessKeyInput.value.indexOf("PLACEHOLDER") !== -1) {
        setStatus(msgError, "is-error");
        return;
      }

      var data = new FormData(form);
      var payload = {};
      data.forEach(function (value, key) { payload[key] = value; });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = msgSending || labelDefault;
      }
      setStatus("", null);

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            form.reset();
            var fieldGroup = form.querySelector(".form-field-group");
            if (fieldGroup) fieldGroup.style.display = "none";
            var label = form.querySelector(".form-label");
            if (label) label.style.display = "none";
            setStatus(msgSuccess, "is-success");
          } else {
            setStatus(msgError, "is-error");
          }
        })
        .catch(function () {
          setStatus(msgError, "is-error");
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = labelDefault;
          }
        });
    });
  });
})();
