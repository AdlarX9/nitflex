import { createContext, useContext } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'

export const MainContext = createContext()
export const useMainContext = () => useContext(MainContext)
export const mainColor = '#D53522'

const axiosGET = async (endpoint, params) => {
	return axios
		.get(import.meta.env.VITE_API + endpoint, { params })
		.then(res => res.data)
		.catch(() => null)
}

const axiosPOST = async (endpoint, body) => {
	console.log(body)
	return axios
		.post(import.meta.env.VITE_API + endpoint, body)
		.then(res => res.data)
		.catch(() => null)
}

const axiosAPI = async (method, endpoint, body, params) => {
	switch (method) {
		case 'GET':
			return axiosGET(endpoint, params)
		case 'POST':
			return axiosPOST(endpoint, body)
		default:
			return null
	}
}

export const useAPI = (method, endpoint, body = {}, params = {}) => {
	const query = useQuery({
		queryKey: [method, endpoint, body, params],
		queryFn: () => axiosAPI(method, endpoint, body, params),
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	})

	return query
}

export const useAPIAfter = (method, endpoint) => {
	const mutation = useMutation({
		mutationKey: [method, endpoint],
		mutationFn: ({ body, params }) => axiosAPI(method, endpoint, body, params)
	})

	const trigger = (body = {}, params = {}) => {
		mutation.mutate({ body, params })
	}

	const triggerAsync = async (body = {}, params = {}) => {
		return mutation.mutateAsync({ body, params })
	}

	return { ...mutation, trigger, triggerAsync }
}
