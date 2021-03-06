"use strict";
var infraIACSrv = soajsApp.components;
infraIACSrv.service('infraIACSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function rerenderTemplates(currentScope) {
		if(currentScope.currentSelectedInfra.templates && Array.isArray(currentScope.currentSelectedInfra.templates) && currentScope.currentSelectedInfra.templates.length > 0){
			let renderedTemplates = {};

			currentScope.currentSelectedInfra.templates.forEach((oneTemplates) => {
				oneTemplates.technology = (oneTemplates.technology === 'vm') ? "vm" : oneTemplates.technology;
				if(!renderedTemplates[oneTemplates.technology]){
					renderedTemplates[oneTemplates.technology] = {};
				}

				if(!renderedTemplates[oneTemplates.technology][oneTemplates.driver]){
					renderedTemplates[oneTemplates.technology][oneTemplates.driver] = [];
				}

				renderedTemplates[oneTemplates.technology][oneTemplates.driver].push(oneTemplates);
			});

			currentScope.currentSelectedInfra.templates = renderedTemplates;
		}
	}

	function injectFormInputs(id, value, form, data) {
		//reset form inputs to 4
		form.entries.length = 5;

		//check location value and inject accordingly new entries

		let additionalInputs = [
			{
				"type": "tabset",
				"tabs": [
					{
						"label": "Content",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							}
						]
					},
					{
						"label": "Inputs",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								'name': 'inputs',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.inputs : [],
								'fieldMsg': "<div class='fieldMsg'>Provide the exposed template inputs using the SOAJS Form Library syntax. To learn more about the SOAJS Form Library <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/63862512/UI+Form'>click here</a></div>",
								'required': false
							}
						]
					},
					{
						"label": "Input Display Options",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								'name': 'display',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.display : "",
								'fieldMsg': "<div class='fieldMsg'>Provide the exposed inputs display using the SOAJS Grid Library syntax. To learn more about the SOAJS Grid Library <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/63861622/UI+Listing+Grid'>click here</a></div>",
								'required': false
							}
						]
					},
					{
						"label": "Input Validation Rules",
						"entries": [
							{
								"type": "html",
								"value": "<br />"
							},
							{
								// 'label': 'Inputs Display Options',
								'name': 'imfv',
								'type': 'jsoneditor',
								'height': '200px',
								'value': (data) ? data.imfv : "",
								'fieldMsg': "<div class='fieldMsg'>Provide the <a href='https://soajsorg.atlassian.net/wiki/spaces/SOAJ/pages/61353979/IMFV' target='_blank'>IMFV</a> validation schema that SOAJS should use during deployment to ensure that the entries provided match the schema of your template inputs.</div>",
								'required': false
							}
						]
					}
				]
			}
		];

		if (value === 'local') {
			additionalInputs[0].tabs[0].entries.push(
				{
					'name': 'textMode',
					'label': 'I am adding a text value',
					'fieldMsg': "Turn on this mode if the value you are about to enter is made up of text only (Default mode does not support text only)",
					'type': 'buttonSlider',
					'value': false,
					'required': true,
					'onAction': function (id, value, form) {
						if (value) {
							//text
							form.entries[5].tabs[0].entries[2].type = 'textarea';
							form.entries[5].tabs[0].entries[2].rows = 30;
							delete form.entries[5].tabs[0].entries[2].editor;
						}
						else {
							//json
							form.entries[5].tabs[0].entries[2].type = 'jsoneditor';
						}
					}
				},
				{
					'name': 'content',
					'type': 'jsoneditor',
					'height': '400px',
					'value': (data) ? data.content : "",
					'tooltip': 'Enter the content of your Template',
					'fieldMsg': "<div class='fieldMsg'>Enter your infra as code template content as a JSON object. To learn more about infra code templates <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>click here</a></div>",
					'required': true
				}
			);
		}
		else if (value === 'external') {
			additionalInputs[0].tabs[0].entries.push({
				'name': 'file',
				'type': 'document',
				'fieldMsg': "<div class='fieldMsg'>Upload your infra as code template. To learn more about infra code templates <a target='_blank'  href='https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/479330491/Infra+As+Code+Templates'>click here</a></div>"
			});
		}

		form.entries = form.entries.concat(additionalInputs);

	}

	function addTemplate(currentScope, oneInfra) {
		currentScope.showTemplateForm = true;
		let entries = angular.copy(infraIACConfig.form.templates);

		//inject select infra type
		oneInfra.drivers.forEach(oneDriver => {
			entries[2].value.push({ 'v': oneDriver, 'l': oneDriver });
		});

		if (oneInfra.templatesTypes.indexOf("local") !== -1) {
			entries[3].value.push({ 'v': 'local', 'l': "SOAJS Console" });
		}

		if (oneInfra.templatesTypes.indexOf("external") !== -1) {
			entries[3].value.push({ 'v': 'external', 'l': "Cloud Provider" });
		}

		oneInfra.technologies.forEach(oneTech => {
            let label = (oneTech === 'vm') ? 'Virtual Machine' : oneTech;
			entries[4].value.push({ 'v': oneTech, 'l': label });
		});

		entries[2].onAction = function(id, value, form) {
			form.entries[3].value = [];
			delete form.formData['location'];
			
			if(oneInfra && oneInfra.override && oneInfra.override.drivers && oneInfra.override.drivers[value]) {
				if(oneInfra.override.drivers[value].templates && Array.isArray(oneInfra.override.drivers[value].templates)) {
					if (oneInfra.override.drivers[value].templates.indexOf("local") !== -1) {
						form.entries[3].value.push({ 'v': 'local', 'l': "SOAJS Console" });
					}

					if (oneInfra.override.drivers[value].templates.indexOf("external") !== -1) {
						form.entries[3].value.push({ 'v': 'external', 'l': "Cloud Provider" });
					}
				}
			}
			else {
				if(oneInfra && oneInfra.templatesTypes) {
					if (oneInfra.templatesTypes.indexOf("local") !== -1) {
						form.entries[3].value.push({ 'v': 'local', 'l': "SOAJS Console" });
					}

					if (oneInfra.templatesTypes.indexOf("external") !== -1) {
						form.entries[3].value.push({ 'v': 'external', 'l': "Cloud Provider" });
					}
				}
			}
		};

		entries[3].onAction = function (id, value, form) {
			injectFormInputs(id, value, form);
		};

		let options = {
			timeout: $timeout,
			entries: entries,
			name: 'addTemplate',
			label: 'Add Infra As Code Template',
			actions: [
				{
					'type': 'submit',
					'label': 'Submit',
					'btn': 'primary',
					'action': function (formData) {
						if (formData.location === 'local') {
							let options = {
								"method": "post",
								"routeName": "/dashboard/infra/template",
								"params": {
									"id": oneInfra._id
								},
								"data": {
									"template": angular.copy(formData)
								}
							};
							
							if(options.data.template.inputs && typeof(options.data.template.inputs) !== 'string'){
								options.data.template.inputs = JSON.stringify(options.data.template.inputs);
							}
							if(options.data.template.display && typeof(options.data.template.display) !== 'string'){
								options.data.template.display = JSON.stringify(options.data.template.display);
							}
							if(options.data.template.imfv && typeof(options.data.template.imfv) !== 'string'){
								options.data.template.imfv = JSON.stringify(options.data.template.imfv);
							}
							
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error.message);
								}
								else {
									currentScope.displayAlert("success", "Template created successfully.");
									currentScope.showTemplateForm = false;
									currentScope.getProviders();
								}
							});
						}
						else if (formData.location === 'external') {
							//need to upload in this case
							let keys = Object.keys(formData);
							let foundFile = false;
							for (let j = 0; j < keys.length; j++) {
								if (keys[j].indexOf('file') !== -1) {
									foundFile = true;
									break;
								}
							}
							if (!foundFile) {
								$window.alert("Please provide a template to proceed!");
							}
							else if (Object.keys(formData).length < 6) {
								$window.alert("Please fill out all the fields to proceed!");
							}
							else {
								let soajsauthCookie = $cookies.get('soajs_auth', { 'domain': interfaceDomain });
								let dashKeyCookie = $cookies.get('soajs_dashboard_key', { 'domain': interfaceDomain });
								let access_token = $cookies.get('access_token', { 'domain': interfaceDomain });

								let progress = { value: 0 };
								let options = {
									url: apiConfiguration.domain + "/dashboard/infra/template/upload",
									params: {
										action: 'add',
										id: oneInfra._id,
										name: formData.name,
										access_token: access_token,
										description: formData.description,
										tags: {
											"type": "template",
											"driver": formData.driver,
											"technology": formData.technology
										}
									},
									file: formData.file_0,
									headers: {
										'soajsauth': soajsauthCookie,
										'key': dashKeyCookie
									}
								};

								overlayLoading.show();
								Upload.upload(options).progress(function (evt) {
									let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
									progress.value = progressPercentage;
								}).success(function (response, status, headers, config) {
									if (response.result === false && response.errors.details.length > 0) {
										overlayLoading.hide();
										// currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
										currentScope.displayAlert('danger', response.errors.details[0].message);
									}
									else if (formData.inputs.length > 0 || typeof(formData.display) === 'object') {
										let compOptions = {
											"method": "post",
											"routeName": "/dashboard/infra/template/upload",
											"params": {
												"id": oneInfra._id
											},
											"data": {
												"name": formData.name,
												"inputs": JSON.stringify(formData.inputs),
												"display": JSON.stringify(formData.display),
												"imfv": JSON.stringify(formData.imfv)
											}
										};
										getSendDataFromServer(currentScope, ngDataApi, compOptions, function (error, data) {
											if (error) {
												overlayLoading.hide();
												currentScope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");

												let tempTemplate = {
													"_id": options.params.name,
													"name": options.params.name
												};
												currentScope.deleteTemplate(tempTemplate, oneInfra);
											}
											else {
												overlayLoading.hide();
												currentScope.displayAlert('success', "Template Uploaded Successfully.");
												currentScope.showTemplateForm = false;
												currentScope.getProviders();
											}
										});
									}
									else {
										overlayLoading.hide();
										currentScope.displayAlert('success', "Template Uploaded Successfully.");
										currentScope.showTemplateForm = false;
										currentScope.getProviders();
									}
								}).error(function () {
									overlayLoading.hide();
									currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
								});

							}
						}
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.showTemplateForm = false;
					}
				}
			]
		};

		buildForm(currentScope, null, options, () => {
			if (entries[3].value.length === 1) {
				entries[3].value[0].selected = true;
				currentScope.form.formData.location = entries[3].value[0].v;
				$timeout(() => {
					injectFormInputs('location', currentScope.form.formData.location, currentScope.form);
				}, 100);
			}
			if (entries[2].value.length === 1) {
				entries[2].value[0].selected = true;
				currentScope.form.formData.driver = entries[2].value[0].v;
			}

			if (entries[4].value.length === 1) {
				entries[4].value[0].selected = true;
				currentScope.form.formData.technology = entries[4].value[0].v;
			}
		});
	}

	function grabEditorContent(location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor) {
		let inputs = inputsEditor.ngModel;
		if (typeof(inputs) === 'string') {
			try {
				formData.inputs = JSON.parse(inputs);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates inputs field.");
				return false;
			}
		}

		let display = displayEditor.ngModel;
		if (typeof(display) === 'string') {
			try {
				formData.display = JSON.parse(display);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates inputs display field.");
				return false;
			}
		}

		let imfv = imfvEditor.ngModel;
		if (typeof(imfv) === 'string') {
			try {
				formData.imfv = JSON.parse(imfv);
			}
			catch (e) {
				$window.alert("Please enter a valid JSON schema inside the templates imfv field.");
				return false;
			}
		}

		if (location === 'local') {
			let content = contentEditor.ngModel;
			if (typeof(content) === 'string') {
				try {
					if(!formData.textMode){
						formData.content = JSON.parse(content);
					}
				}
				catch (e) {
					$window.alert("Please enter a valid JSON schema inside the templates field.");
					return false;
				}
			}
		}

		return true;
	}

	function editTemplate(currentScope, oneInfra, oneTemplate) {
		let contentEditor, inputsEditor, displayEditor, imfvEditor;
		let entries = angular.copy(infraIACConfig.form.templates);
		entries[0].readonly = true;
		entries[0].disabled = true;

		let options;
		currentScope.showTemplateForm = true;

		oneInfra.drivers.forEach(oneDriver => {
			entries[2].value.push({ 'v': oneDriver, 'l': oneDriver });
		});
		entries[2].disabled = true;

		oneInfra.technologies.forEach(oneTech => {
			let label = (oneTech === 'vm') ? 'Virtual Machine' : oneTech;
			entries[4].value.push({ 'v': oneTech, 'l': label });
		});

		if (oneTemplate.location === 'local') {
			entries[3].value.push({ 'v': 'local', 'l': "SOAJS Console", 'selected': true });
			entries[3].disabled = true;

			let formData = angular.copy(oneTemplate);

			if(!formData.textMode && typeof(formData.content) === 'string'){
				formData.content = JSON.parse(formData.content);
			}
			
			if (typeof(formData.inputs) === "string") {
				try {
					formData.inputs = JSON.parse(formData.inputs)
				} catch (e) {
					formData.inputs = {};
					currentScope.displayAlert('danger', "There was an error parsing the template Inputs. Please make sure the Inputs follow a valid JSON schema.");
				}
			}
			if (typeof(formData.display) === "string") {
				try {
					formData.display = JSON.parse(formData.display)
				} catch (e) {
					formData.display = {};
					currentScope.displayAlert('danger', "There was an error parsing the template Display Options. Please make sure the Display Options follow a valid JSON schema.");
				}
			}
			if (typeof(formData.imfv) === "string") {
				try {
					formData.imfv = JSON.parse(formData.imfv)
				} catch (e) {
					formData.imfv = {};
					currentScope.displayAlert('danger', "There was an error parsing the template Input Validation Rules. Please make sure the Input Validation Rules follow a valid JSON schema.");
				}
			}

			delete formData.tags;
			options = {
				timeout: $timeout,
				entries: entries,
				data: formData,
				name: 'editTemplate',
				label: 'Modify Infra As Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor);
							if (!status) {
								return false;
							}

							let options = {
								"method": "put",
								"routeName": "/dashboard/infra/template",
								"params": {
									"id": oneTemplate._id
								},
								"data": {
									"template": angular.copy(formData)
								}
							};

							if(options.data.template.content && typeof(options.data.template.content) !== 'string'){
								options.data.template.content = JSON.stringify(options.data.template.content);
							}

							if(options.data.template.inputs && typeof(options.data.template.inputs) !== 'string'){
								options.data.template.inputs = JSON.stringify(options.data.template.inputs);
							}
							if(options.data.template.display && typeof(options.data.template.display) !== 'string'){
								options.data.template.display = JSON.stringify(options.data.template.display);
							}
							if(options.data.template.imfv && typeof(options.data.template.imfv) !== 'string'){
								options.data.template.imfv = JSON.stringify(options.data.template.imfv);
							}

							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, options, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert("danger", error);
								}
								else {
									currentScope.displayAlert("success", "Template modified successfully.");
									currentScope.showTemplateForm = false;
									currentScope.getProviders();
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete currentScope.form.formData;
							currentScope.showTemplateForm = false;
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options, oneTemplate);
		}
		else {
			entries[3].value.push({ 'v': 'external', 'l': "Cloud Provider", 'selected': true });
			entries[3].disabled = true;

			let formData = angular.copy(oneTemplate);
			delete formData.tags;
			options = {
				timeout: $timeout,
				entries: entries,
				data: formData,
				name: 'editTemplate',
				label: 'Modify Infra As Code Template',
				actions: [
					{
						'type': 'submit',
						'label': 'Submit',
						'btn': 'primary',
						'action': function (formData) {
							let status = grabEditorContent(oneTemplate.location, formData, inputsEditor, displayEditor, contentEditor, imfvEditor);
							if (!status) {
								return false;
							}

							if (formData.file_0) {
								uploadNewTemplateFile(formData);
							}
							else {
								updateTemplateCompletemntaryInfo(formData);
							}
						}
					},
					{
						'type': 'reset',
						'label': 'Cancel',
						'btn': 'danger',
						'action': function () {
							delete currentScope.form.formData;
							currentScope.showTemplateForm = false;
						}
					}
				]
			};

			injectFormInputs('location', oneTemplate.location, options, oneTemplate);
		}

		buildForm(currentScope, null, options, () => {
			inputsEditor = currentScope.form.entries[5].tabs[1].entries[1];
			displayEditor = currentScope.form.entries[5].tabs[2].entries[1];
			imfvEditor = currentScope.form.entries[5].tabs[3].entries[1];
			if (oneTemplate.location === 'local') {
				contentEditor = currentScope.form.entries[5].tabs[0].entries[1];
			}

			if(oneTemplate.textMode){
				//text
				currentScope.form.entries[5].tabs[0].entries[2].type = 'textarea';
				currentScope.form.entries[5].tabs[0].entries[2].rows = 30;
				delete currentScope.form.entries[5].tabs[0].entries[2].editor;
			}
			if(oneTemplate.technology){
				currentScope.form.formData.technology = oneTemplate.technology;
			}
		});

		function uploadNewTemplateFile(formData) {
			let soajsauthCookie = $cookies.get('soajs_auth', { 'domain': interfaceDomain });
			let dashKeyCookie = $cookies.get('soajs_dashboard_key', { 'domain': interfaceDomain });
			let access_token = $cookies.get('access_token', { 'domain': interfaceDomain });

			let progress = { value: 0 };
			let options = {
				url: apiConfiguration.domain + "/dashboard/infra/template/upload",
				params: {
					action: 'edit',
					id: oneInfra._id,
					name: oneTemplate.name,
					description: formData.description,
					access_token: access_token,
					tags: {
						"type": "template",
						"driver": formData.driver,
						"technology": formData.technology
					}
				},
				file: formData.file_0,
				headers: {
					'soajsauth': soajsauthCookie,
					'key': dashKeyCookie
				}
			};
			options.params.tags.type = "template";

			overlayLoading.show();
			Upload.upload(options).progress(function (evt) {
				let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
				progress.value = progressPercentage;
			}).success(function (response, status, headers, config) {
				if (response.result === false && response.errors.details.length > 0) {
					overlayLoading.hide();
					currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
				}
				else {
					updateTemplateCompletemntaryInfo(formData);
				}
			}).error(function () {
				overlayLoading.hide();
				currentScope.displayAlert('danger', "An Error Occurred while uploading your template, please try again.");
			});
		}

		function updateTemplateCompletemntaryInfo(formData) {
			if (formData.inputs.length > 0 || typeof(formData.display) === 'object') {
				let compOptions = {
					"method": "post",
					"routeName": "/dashboard/infra/template/upload",
					"params": {
						"id": oneInfra._id
					},
					"data": {
						"name": oneTemplate.name,
						"inputs": JSON.stringify(formData.inputs),
						"display": JSON.stringify(formData.display),
						"imfv": JSON.stringify(formData.imfv)
					}
				};
				overlayLoading.show();
				getSendDataFromServer(currentScope, ngDataApi, compOptions, function (error, data) {
					overlayLoading.hide();
					if (error) {
						currentScope.displayAlert('danger', "Template uploaded successfully, but there was an error uploading the template input options, please try again.");
					}
					else {
						currentScope.displayAlert('success', "Template Uploaded Successfully.");
						currentScope.showTemplateForm = false;
						currentScope.getProviders();
					}
				});
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', "Template Uploaded Successfully.");
				currentScope.showTemplateForm = false;
				currentScope.getProviders();
			}
		}
	}

	return {
		'rerenderTemplates': rerenderTemplates,
		'addTemplate': addTemplate,
		'editTemplate': editTemplate
	};
}]);
