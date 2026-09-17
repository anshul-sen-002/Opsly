import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, PasswordInput } from "./input";

const schema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

/** Mirrors the staff login page form wiring exactly */
function TestForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Email address"
        type="email"
        error={errors.email?.message}
        {...registerField("email")}
      />
      <PasswordInput
        label="Password"
        placeholder="pw"
        error={errors.password?.message}
        {...registerField("password")}
      />
      <button type="submit">Sign in</button>
    </form>
  );
}

describe("Input / PasswordInput with react-hook-form register", () => {
  it("collects typed values and submits them", async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Email address"), "admin@test.com");
    await userEvent.type(screen.getByPlaceholderText("pw"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSubmit).toHaveBeenCalledWith(
      { email: "admin@test.com", password: "secret123" },
      expect.anything()
    );
  });
});
