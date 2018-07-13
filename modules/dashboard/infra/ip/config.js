'use strict';

let infraIPConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeIP: ['dashboard', '/infra/extra', 'delete'],
		addIP: ['dashboard', '/infra/extra', 'post'],
		editIP: ['dashboard', '/infra/extra', 'put']
	},
	
	form: {
		network: [
			{
				'name': 'name',
				'label': 'Name',
				'type': 'text',
				'value': "",
				'placeholder': 'My Template',
				'fieldMsg': 'Enter a name for your template',
				'required': true
			},
			{
				'name': 'description',
				'label': 'Description',
				'type': 'textarea',
				'value': "",
				'placeholder': 'My Template Description',
				'fieldMsg': 'Provide  a description for your template',
				'required': false
			},
			{
				'name': 'location',
				'label': 'Location',
				'type': 'select',
				'value': [],
				'fieldMsg': 'Select where to store this template.',
				'required': true
			}
		]
	}
};