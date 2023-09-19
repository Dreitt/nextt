'use client'

import { experimental_useFormState as useFormState } from 'react-dom'
import { experimental_useFormStatus as useFormStatus } from 'react-dom'
import { deleteTodo } from '@/app/actions'

const initialState = {
  message: null,
}

function DeleteButton({ message }: { message: string }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {message ? message : 'Delete'}
    </button>
  )
}

export function DeleteForm({ id }: { id: number }) {
  const [state, formAction] = useFormState(deleteTodo, initialState)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <DeleteButton {...state} />
    </form>
  )
}
