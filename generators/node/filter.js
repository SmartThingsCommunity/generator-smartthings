module.exports = generator => option => {
	if (option.typeIn) {
		if (option.typeIn.indexOf(generator.appConfig.type) === -1) {
			return false
		}
	}

	if (option.typeNotIn) {
		if (option.typeNotIn.indexOf(generator.appConfig.type) !== -1) {
			return false
		}
	}

	for (const key in option) {
		if (option[key] !== undefined || option[key] !== null) {
			if (typeof option[key] === 'boolean') {
				const value = generator.appConfig[key]
				const truthy = value !== undefined && value !== null && value !== ''
				if (truthy !== option[key]) {
					return false
				}
			}

			if (typeof option[key] === 'object') {
				if (option[key].in && option[key].in.indexOf(generator.appConfig[key]) === -1) {
					return false
				}

				if (option[key].notIn && option[key].notIn.indexOf(generator.appConfig[key]) !== -1) {
					return false
				}
			}
		}
	}

	return true
}
