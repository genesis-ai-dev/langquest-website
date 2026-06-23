type StepLayoutProps = {
  title: string;
  description: string;
};

function StepLayout({ title, description }: StepLayoutProps) {
  return (
    <>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </>
  );
}

export { StepLayout };
