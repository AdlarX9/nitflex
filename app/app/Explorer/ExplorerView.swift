import SwiftUI

struct ExplorerView: View {
    @ObservedObject var viewModel: ExplorerViewModel

    var body: some View {
        VStack {
            HStack {
                Button (action: {
                    viewModel.showProfileView = true
                }) {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .aspectRatio(1, contentMode: .fit)
                        .frame(width: 28)
                        .foregroundColor(Constants.red)
                    Text("Profil")
                        .font(.system(size: 20, weight: .bold))
                }
                .buttonStyle(PlainButtonStyle())
                .onHover { hovering in
                    if hovering {
                        NSCursor.pointingHand.push()
                    } else {
                        NSCursor.pop()
                    }
                }
                Spacer()
                NavigationLink(destination: {
                    VStack {
                        Text("Test")
                    }
                }) {
                    Image(systemName: "arrow.down.circle")
                        .resizable()
                        .aspectRatio(1, contentMode: .fit)
                        .frame(width: 28)
                        .foregroundColor(.white)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding()
            Spacer()
        }
        .foregroundColor(.white)
        .sheet(isPresented: $viewModel.showProfileView) {
            ProfileView(viewModel: viewModel)
        }
    }
}

#Preview {
    WrapperView()
}
